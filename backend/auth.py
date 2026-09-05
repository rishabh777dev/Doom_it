import uuid
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from backend.config import settings
from backend.database import get_db
from backend.models import Team, Session as UserSession

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_token_from_cookie_or_header(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        
    if not token:
        token = request.cookies.get("access_token")
        
    if not token:
        token = request.query_params.get("token")
            
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token

def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Team:
    token = get_token_from_cookie_or_header(request)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        session_token: str = payload.get("session_token")
        if username is None or session_token is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    team = db.query(Team).filter(Team.team_name == username).first()
    if team is None:
        raise credentials_exception

    # Enforce single-device login session tracking if enabled (admins exempt)
    if settings.SINGLE_DEVICE_LOGIN and team.team_name != "admin":
        active_sess = db.query(UserSession).filter(
            UserSession.user_id == team.id,
            UserSession.is_active == True
        ).order_by(UserSession.created_at.desc()).first()
        
        if not active_sess or active_sess.session_token != session_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="SESSION_SUPERSEDED: Your team's active battle terminal was transferred to another device.",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Update last activity
        active_sess.last_activity_at = datetime.utcnow()
        db.commit()

    return team

def get_current_participant(
    current_team: Team = Depends(get_current_user)
) -> Team:
    if current_team.team_name == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authenticated participant teams can access this endpoint."
        )
    return current_team

def get_current_admin(
    current_team: Team = Depends(get_current_user)
) -> Team:
    if current_team.team_name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )
    return current_team

def init_user_session(db: Session, user_id: str, is_admin: bool = False) -> str:
    # Deactivate previous active sessions for this user if single device policy is active and not admin
    if settings.SINGLE_DEVICE_LOGIN and not is_admin:
        db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        ).update({"is_active": False})
    
    # Create new active session
    new_token = str(uuid.uuid4())
    db_session = UserSession(
        user_id=user_id,
        session_token=new_token,
        is_active=True,
        created_at=datetime.utcnow(),
        last_activity_at=datetime.utcnow()
    )
    db.add(db_session)
    db.commit()
    return new_token

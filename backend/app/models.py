from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    oauth_provider = Column(String, nullable=True)  # 'google', etc.
    oauth_id = Column(String, nullable=True)
    lists = relationship("ZipCodeList", back_populates="owner")
    comparisons = relationship("Comparison", back_populates="owner")

class ZipCodeList(Base):
    __tablename__ = "zip_code_lists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    zip_codes = Column(JSON)  # Store as JSON array
    matched_data = Column(JSON, nullable=True)  # Store matched USPS data
    
    owner = relationship("User", back_populates="lists")
    comparisons_as_base = relationship("Comparison", foreign_keys="[Comparison.base_list_id]", back_populates="base_list")
    comparisons_as_compare = relationship("Comparison", foreign_keys="[Comparison.compare_list_id]", back_populates="compare_list")

class Comparison(Base):
    __tablename__ = "comparisons"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    base_list_id = Column(Integer, ForeignKey("zip_code_lists.id"))
    compare_list_id = Column(Integer, ForeignKey("zip_code_lists.id"))
    differences = Column(JSON)  # Store added, removed, modified ZIP codes
    name = Column(String, nullable=True)
    
    owner = relationship("User", back_populates="comparisons")
    base_list = relationship("ZipCodeList", foreign_keys=[base_list_id], back_populates="comparisons_as_base")
    compare_list = relationship("ZipCodeList", foreign_keys=[compare_list_id], back_populates="comparisons_as_compare") 
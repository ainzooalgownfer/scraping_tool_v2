from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"
    SECRET_KEY: str = "your-secret-key-change-in-production"

    class Config:
        env_file = ".env"

settings = Settings()
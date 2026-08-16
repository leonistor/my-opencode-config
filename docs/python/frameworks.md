# Framework-Specific Guidelines

## FastAPI / Pydantic v2

### Project structure

```
app/
  main.py           # create_app()
  routers/          # one file per resource, APIRouter
  schemas/          # Pydantic request/response models
  services/         # business logic, no HTTP types
  models/           # SQLAlchemy or SQLModel
  deps.py           # shared Depends() callables
```

### Lifespan (3.11+)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    await cache.warm()
    yield
    await db.disconnect()
    await cache.close()

app = FastAPI(lifespan=lifespan)
```

### Dependencies

```python
from collections.abc import AsyncIterator
from typing import Annotated
from fastapi import Depends

async def get_db() -> AsyncIterator[AsyncSession]:
    async with async_session_maker() as s:
        yield s

DbSession = Annotated[AsyncSession, Depends(get_db)]

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: DbSession) -> UserOut:
    ...
```

`Annotated[X, Depends(...)]` is the modern type-safe pattern.

### CORS

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://example.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### Testing

```python
from httpx import AsyncClient, ASGITransport
from app.main import app

async def test_health():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        r = await client.get("/health")
    assert r.status_code == 200
```

---

## Pydantic v2

```python
from pydantic import BaseModel, Field, field_validator, ConfigDict

class UserIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    email: str
    age: int = Field(ge=0, le=150)

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        return v.lower()

class UserOut(UserIn):
    id: int

    @classmethod
    def from_orm_row(cls, row) -> "UserOut":
        return cls.model_validate(row, from_attributes=True)
```

Key differences from v1:

- `model_config` replaces inner `Config` class.
- `model_validate(...)` replaces `parse_obj()`.
- `from_attributes=True` replaces `orm_mode = True`.
- Use `Annotated[str, Field(...)]` for reusable field types.

---

## SQLAlchemy 2.0 (async)

```python
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(index=True)
    email: Mapped[str]

async def get_user(user_id: int) -> User | None:
    async with async_session_maker() as s:
        return await s.get(User, user_id)
```

Prefer `Mapped[T]` annotations over legacy `Column()` calls.
`expire_on_commit=False` avoids implicit I/O on attribute access in async code.

---

## SQLModel

Combines SQLAlchemy + Pydantic. Best for new projects where one model class
serves both the database and the API.

```python
from sqlmodel import Field, SQLModel, Session, select

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str

class UserCreate(SQLModel):  # request body only (no table=True)
    name: str
```

---

## Django

### Model with proper Meta

```python
from django.db import models

class Order(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="orders"
    )
    total = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(total__gte=0),
                name="non_negative_total",
            ),
        ]
```

### Avoid N+1 queries

```python
# N queries — each access to order.user fires a separate query
for order in Order.objects.all():
    print(order.user.name)

# 1 query — JOIN via select_related
for order in Order.objects.select_related("user").all():
    print(order.user.name)

# Many-to-many: prefetch_related
posts = Post.objects.prefetch_related("comments__author").all()
```

### DRF ViewSet

```python
from rest_framework import viewsets, permissions

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related("user").all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"])
    def recent(self, request):
        qs = self.get_queryset().filter(created_at__gte=...)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(
            self.get_serializer(page, many=True).data
        )
```

### Production settings

```python
DEBUG = False
ALLOWED_HOSTS = [".example.com"]
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CONN_MAX_AGE = 300
```

---

## Flask

### Application factory

```python
from flask import Flask
from .extensions import db, migrate

def create_app(config_name: str = "production") -> Flask:
    app = Flask(__name__)
    app.config.from_object(f"app.config.{config_name.title()}")

    db.init_app(app)
    migrate.init_app(app, db)

    from .blueprints.users import bp as users_bp
    app.register_blueprint(users_bp, url_prefix="/api/v1/users")

    return app
```

### Blueprints

```python
# blueprints/users.py
from flask import Blueprint, jsonify

bp = Blueprint("users", __name__)

@bp.get("/<int:user_id>")
def get_user(user_id: int):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())
```

### OpenAPI with flask-smorest

```python
from flask.views import MethodView
from flask_smorest import Blueprint as SmorestBlueprint
from marshmallow import Schema, fields

class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)

blp = SmorestBlueprint("users", __name__, description="Users resource")

@blp.route("/<int:user_id>")
class UserResource(MethodView):
    @blp.response(200, UserSchema)
    def get(self, user_id: int):
        return User.query.get_or_404(user_id)
```

---

## Framework testing quick reference

| Framework | Tool / pattern                                        |
| --------- | ----------------------------------------------------- |
| FastAPI   | `httpx.AsyncClient(transport=ASGITransport(app=app))` |
| Django    | `pytest-django` with `rf = RequestFactory()`          |
| Flask     | `app.test_client()` or `pytest-flask`                 |

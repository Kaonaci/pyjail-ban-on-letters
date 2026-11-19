FROM python:3.12-slim

WORKDIR /app

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin app \
    && python -m venv /app/.venv \
    && chown -R app:app /app

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

USER app

COPY --chown=app:app backend/requirements.txt ./backend/requirements.txt

RUN pip install --no-cache-dir -r backend/requirements.txt

COPY --chown=app:app backend/ ./backend/
COPY --chown=app:app frontend/ ./frontend/

EXPOSE 8000

ENTRYPOINT ["python", "-m", "uvicorn"]

CMD ["backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
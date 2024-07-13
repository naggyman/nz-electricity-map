FROM python:3.12.3-slim

COPY backend/requirements.txt requirements.txt

RUN pip install -r requirements.txt

COPY backend/ /

CMD ["python", "main.py"]
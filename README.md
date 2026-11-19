# Pyjail ban on letters

A small web-based tool for transforming text using different character mappings. Inspired by a CTF challenge and the idea of building something similar to [CyberChef](https://gchq.github.io/CyberChef/).

## Motivation

The idea for this project came to me while solving a CTF challenge. I cannot disclose the challenge name, but its concept was interesting enough to inspire a separate tool.

The server checked user input against a blacklist, rejecting ASCII letters and underscores. A simplified example of the idea:

```python
from string import ascii_letters

BLACK_LIST = ascii_letters + '_'

def proceed_input(text: str):
    for char in BLACK_LIST:
        if char in text:
            return "No-no, mister fih, you can't use ascii letters"

    try:
        result = eval(text)
        return result
    except:
        return "Not today(("
```

This made me think about creating a tool that could transform an input string into another representation that does not contain certain characters, and can be converted to a valid ascii variant (Python3 NFKC or octal represented strings).

The goal was to build something similar to CyberChef, but focused on character mapping. Depending on the selected mapping, the output can avoid ASCII letters, underscores, or other characters.

The tool supports combining multiple transformations into a single processing pipeline.

**Note:** The code above is only an illustration of the challenge's concept. Blacklist-based input filtering does not make `eval()` safe (use white list instead).

## Features

- Multiple character mappings.
- Sequential application of transformations.
- Customizable mapping alphabets.
- Ability to restore default alphabets.
- Drag-and-drop interface for arranging transformations.
- Real-time text processing.
- Copying input and output text.

## Installation

### Requirements

- Python 3.12+
- pip

### Without Docker

Clone the repository:

```bash
git clone 
cd pyjail-ban-on-letters
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Start the application:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000 in your browser.

### With Docker

Build the image:

```bash
docker build -t pyjail-ban-on-letters .
```

Run the container:

```bash
docker run --rm -p 8000:8000 pyjail-ban-on-letters
```

Open http://localhost:8000 in your browser.

## Interface

The interface is divided into three main columns.

### 1. Available mappings

The left column contains the available character mappings. Each mapping can be added to the processing pipeline.

### 2. Processing pipeline

The middle column contains the selected mappings.

- Drag and drop mappings to change their order.
- Add the same mapping multiple times if needed.
- Edit the alphabet used by a mapping.
- Restore the default alphabet.

Transformations are applied sequentially, from top to bottom.

### 3. Input and output

The right column contains the input and output text areas.

- Enter the source text in the input area.
- The output is updated as transformations are applied.
- Copy the input or output text using the corresponding buttons.

## Project structure

```text
.
├── backend/
│   ├── config.py
│   ├── __init__.py
│   ├── main.py
│   ├── mappers/
│   │   ├── ascii_to_bold_italic_unicode.py
│   │   ├── ascii_to_bold_script_unicode.py
│   │   ├── ascii_to_bold_unicode.py
│   │   ├── ascii_to_italic_unicode.py
│   │   ├── ascii_to_oct.py
│   │   ├── ascii_to_script_unicode.py
│   │   ├── ascii_to_unicode.py
│   │   ├── __init__.py
│   │   └── mapper.py
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── mapping.py
│   │   └── schemas.py
│   └── services/
│       ├── char_replacer.py
│       └── __init__.py
├── Dockerfile
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── style.css
└── README.md
```

### Backend

The backend is built with FastAPI.

- `mappers/` — character mapping implementations and their common abstraction.
- `services/` — text transformation logic.
- `routers/` — API routes and request/response schemas.
- `config.py` — application configuration.
- `main.py` — application entry point and route registration.

### Frontend

The frontend uses plain HTML, CSS, and JavaScript without a frontend framework.

## API documentation

When the application is running, interactive API documentation is available at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
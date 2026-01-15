# Admin Web Panel

Simple, minimalistic admin web interface for the Car Rental platform.

## Setup

1. Make sure the FastAPI backend is running:
   ```bash
   uvicorn app.main:app --reload
   ```

2. Open `index.html` in a web browser or serve it using a local web server.

## Default Admin Credentials

- **Email:** `admin@carrental.com`
- **Password:** `Admin123!`

## Configuration

The API base URL is configured in `login.js`. By default, it points to:
```
http://localhost:8000/api/v1
```

To change the API URL, edit the `API_BASE_URL` constant in `login.js`.

## Files

- `index.html` - Login page
- `styles.css` - Minimal styling
- `login.js` - Login functionality
- `dashboard.html` - Admin dashboard (to be implemented)

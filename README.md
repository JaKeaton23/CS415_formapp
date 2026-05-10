# CS415 Form Sign Up App

This is my sign up form project for CS415.

The app lets a user enter their name, email, phone number, and choose a category. The form checks the input before it can be submitted. After the form is submitted, the saved person shows up in the People list on the page.

## What I Used

- React
- Vite
- Node.js
- Express
- DynamoDB Local
- Docker Compose

## How To Run It

First go into the app folder:

```bash
cd signup-form-app
```

Then run the full app with Docker:

```bash
docker compose up --build
```

After it starts, open the frontend on port `5173`.

The app uses these ports:

- Frontend: `5173`
- API: `3001`
- DynamoDB Local: `8000`

## Notes

The database runs in memory for this project, so saved form entries reset when the containers are stopped.

The form has a short delay after clicking submit so the saving message can be seen.

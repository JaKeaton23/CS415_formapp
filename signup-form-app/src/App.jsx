import SignUpForm from './components/SignUpForm.jsx';

/**
 * Root application component.
 * Renders a header and the controlled SignUpForm.
 */
function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Sign Up</h1>
        <p className="app-subtitle">
          Fill out the form below. Validation runs in real-time as you type.
        </p>
      </header>
      <main>
        <SignUpForm />
      </main>
      <footer className="app-footer">
        <small>&copy; {new Date().getFullYear()} SignUp Form Demo</small>
      </footer>
    </div>
  );
}

export default App;

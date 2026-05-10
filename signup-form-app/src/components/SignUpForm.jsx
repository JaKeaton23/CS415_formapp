import { useEffect, useMemo, useState } from 'react';
import {
  CATEGORIES,
  validateName,
  validateEmail,
  validatePhone,
  validateCategory,
  validateAll,
  validate,
} from '../utils/validation.js';
import { getSignups, getSignupsByCategory, createSignup } from '../utils/api.js';
import './SignUpForm.css';

/**
 * Save status state machine for the submit lifecycle:
 *   READY   -> initial / after reset / after success acknowledged
 *   SAVING  -> request in flight (submit button disabled, spinner shown)
 *   SUCCESS -> server returned 2xx (banner shown, auto reverts to READY)
 *   ERROR   -> server returned an error (banner shown until next interaction)
 */
const STATUS = {
  READY: 'READY',
  SAVING: 'SAVING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
};

// The empty form is referenced both as the initial state and on reset after submit.
const EMPTY_FORM = Object.freeze({
  name: '',
  email: '',
  phone: '',
  category: '',
});

/**
 * SignUpForm
 *
 * A controlled form component that:
 *   - Manages name / email / phone / category fields with React state
 *   - Runs validation on every keystroke and reveals errors after blur or submit
 *   - Disables submit when the form is invalid or already saving
 *   - Calls the backend API which intentionally sleeps for 5 seconds before responding
 *   - Loads and displays the existing list of sign-ups, filterable by category
 */
function SignUpForm() {
  // Controlled form values.
  const [form, setForm] = useState(EMPTY_FORM);

  // Per-field error messages. Empty string means valid.
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', phone: '', category: '' });

  // Submit lifecycle state machine.
  const [saveStatus, setSaveStatus] = useState(STATUS.READY);
  const [submitError, setSubmitError] = useState('');

  // People list + filter state.
  const [people, setPeople] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // Derived: valid when every field passes validation.
  const formIsValid = useMemo(() => validate(form), [form]);

  // Submit is disabled while saving OR while the form is invalid.
  const submitDisabled = !formIsValid || saveStatus === STATUS.SAVING;

  /**
   * Load the list on mount and reload it whenever the filter changes.
   */
  useEffect(() => {
    let cancelled = false;
    async function loadFiltered() {
      setListLoading(true);
      setListError('');
      try {
        const result = filterCategory
          ? await getSignupsByCategory(filterCategory)
          : await getSignups();
        if (!cancelled) setPeople(Array.isArray(result) ? result : []);
      } catch (err) {
        if (!cancelled) setListError(err.message || 'Failed to load sign-ups.');
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }
    loadFiltered();
    return () => {
      cancelled = true;
    };
  }, [filterCategory]);

  /**
   * Map a single field name to its validator.
   * Centralised so handleChange / handleBlur stay tidy.
   */
  function validateField(name, value) {
    switch (name) {
      case 'name':
        return validateName(value);
      case 'email':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      case 'category':
        return validateCategory(value);
      default:
        return '';
    }
  }

  /**
   * Controlled-input change handler.
   * Updates the value AND revalidates that single field for real-time feedback.
   */
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    // If the user starts editing again after a successful save, reset the banner.
    if (saveStatus === STATUS.SUCCESS || saveStatus === STATUS.ERROR) {
      setSaveStatus(STATUS.READY);
      setSubmitError('');
    }
  }

  /**
   * Submit handler.
   * - Validates everything one more time
   * - Marks all fields touched so any remaining errors become visible
   * - Calls the API (which sleeps server-side for 5 seconds) and updates state
   */
  async function handleSubmit(event) {
    event.preventDefault();
    const allErrors = validateAll(form);
    setFieldErrors(allErrors);
    if (!validate(form)) return;

    setSaveStatus(STATUS.SAVING);
    setSubmitError('');
    try {
      const created = await createSignup({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        category: form.category,
      });

      // Optimistically prepend only when the new entry belongs in the visible filter.
      setPeople((prev) => (
        !filterCategory || created.category === filterCategory ? [created, ...prev] : prev
      ));
      setSaveStatus(STATUS.SUCCESS);
      setForm(EMPTY_FORM);
      setFieldErrors({ name: '', email: '', phone: '', category: '' });

      // Auto-revert the success banner after a short delay.
      window.setTimeout(() => {
        setSaveStatus((current) => (current === STATUS.SUCCESS ? STATUS.READY : current));
      }, 3000);
    } catch (err) {
      setSaveStatus(STATUS.ERROR);
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    }
  }

  /**
   * Render an error message for a field, but only after the user has touched it
   * or attempted to submit (which marks every field touched).
   */
  function renderError(field) {
    if (!fieldErrors[field]) return null;
    return <span className="error-message" role="alert">{fieldErrors[field]}</span>;
  }

  return (
    <section className="signup-wrapper" aria-label="Sign up">
      <form className="signup-form" onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.name)}
            className={fieldErrors.name ? 'invalid' : ''}
            placeholder="Jane Doe"
          />
          {renderError('name')}
        </div>

        <div className="form-row">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.email)}
            className={fieldErrors.email ? 'invalid' : ''}
            placeholder="jane@example.com"
          />
          {renderError('email')}
        </div>

        <div className="form-row">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.phone)}
            className={fieldErrors.phone ? 'invalid' : ''}
            placeholder="(555) 123-4567"
          />
          {renderError('phone')}
        </div>

        <div className="form-row">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.category)}
            className={fieldErrors.category ? 'invalid' : ''}
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {renderError('category')}
        </div>

        <div className={`status-banner status-${saveStatus.toLowerCase()}`} role="status">
          {saveStatus === STATUS.READY && <span>Ready to submit.</span>}
          {saveStatus === STATUS.SAVING && <span>Saving… this takes about 5 seconds.</span>}
          {saveStatus === STATUS.SUCCESS && <span>Sign-up saved successfully!</span>}
          {saveStatus === STATUS.ERROR && <span>Error: {submitError}</span>}
        </div>

        <button type="submit" className="submit-button" disabled={submitDisabled}>
          {saveStatus === STATUS.SAVING ? 'Saving…' : 'Sign Up'}
        </button>
      </form>

      <section className="people-section" aria-label="Existing sign-ups">
        <header className="people-header">
          <h2>People</h2>
        </header>

        {listError && <div className="list-error" role="alert">{listError}</div>}

        <div className="table-wrapper">
          <table className="people-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Category</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {listLoading && (
                <tr><td colSpan={5} className="muted">Loading…</td></tr>
              )}
              {!listLoading && people.length === 0 && (
                <tr><td colSpan={5} className="muted">No sign-ups yet.</td></tr>
              )}
              {!listLoading && people.map((p) => (
                <tr key={p.id || `${p.email}-${p.createdAt}`}>
                  <td>{p.name}</td>
                  <td>{p.email}</td>
                  <td>{p.phone}</td>
                  <td>{p.category}</td>
                  <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="filter-row filter-row-bottom">
          <label htmlFor="filterCategory">Filter by category:</label>
          <select
            id="filterCategory"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </section>
    </section>
  );
}

export default SignUpForm;

import { useEffect, useMemo, useState } from 'react';
import {
  CATEGORIES,
  validateName,
  validateEmail,
  validatePhone,
  validateCategory,
  validateAll,
  isFormValid,
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
  const [errors, setErrors] = useState({ name: '', email: '', phone: '', category: '' });

  // Tracks which fields the user has interacted with so we can defer error display.
  const [touched, setTouched] = useState({ name: false, email: false, phone: false, category: false });

  // Submit lifecycle state machine.
  const [saveStatus, setSaveStatus] = useState(STATUS.READY);
  const [submitError, setSubmitError] = useState('');

  // People list + filter state.
  const [people, setPeople] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // Derived: valid when every field passes validation.
  const formIsValid = useMemo(() => isFormValid(form), [form]);

  // Submit is disabled while saving OR while the form is invalid.
  const submitDisabled = !formIsValid || saveStatus === STATUS.SAVING;

  /**
   * On mount, load the initial list of sign-ups.
   * (We don't depend on filterCategory here — the dedicated effect below handles that.)
   */
  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      setListLoading(true);
      setListError('');
      try {
        const result = await getSignups();
        if (!cancelled) setPeople(Array.isArray(result) ? result : []);
      } catch (err) {
        if (!cancelled) setListError(err.message || 'Failed to load sign-ups.');
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }
    loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Reload the list whenever the filter changes (after the initial mount).
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
    // Skip the very first render — the mount effect above handles it.
    if (filterCategory !== '' || people.length > 0) loadFiltered();
    return () => {
      cancelled = true;
    };
    // We only want to react to filter changes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    // If the user starts editing again after a successful save, reset the banner.
    if (saveStatus === STATUS.SUCCESS || saveStatus === STATUS.ERROR) {
      setSaveStatus(STATUS.READY);
      setSubmitError('');
    }
  }

  /**
   * Mark fields as touched on blur so the corresponding error message
   * can be revealed without flashing while the user is still typing.
   */
  function handleBlur(event) {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
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
    setErrors(allErrors);
    setTouched({ name: true, email: true, phone: true, category: true });
    if (!isFormValid(form)) return;

    setSaveStatus(STATUS.SAVING);
    setSubmitError('');
    try {
      const created = await createSignup({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        category: form.category,
      });

      // Optimistically prepend to the visible list so users see their entry immediately.
      setPeople((prev) => [created, ...prev]);
      setSaveStatus(STATUS.SUCCESS);
      setForm(EMPTY_FORM);
      setTouched({ name: false, email: false, phone: false, category: false });
      setErrors({ name: '', email: '', phone: '', category: '' });

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
    if (!touched[field] || !errors[field]) return null;
    return <span className="error-message" role="alert">{errors[field]}</span>;
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
            onBlur={handleBlur}
            aria-invalid={Boolean(errors.name && touched.name)}
            className={errors.name && touched.name ? 'invalid' : ''}
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
            onBlur={handleBlur}
            aria-invalid={Boolean(errors.email && touched.email)}
            className={errors.email && touched.email ? 'invalid' : ''}
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
            onBlur={handleBlur}
            aria-invalid={Boolean(errors.phone && touched.phone)}
            className={errors.phone && touched.phone ? 'invalid' : ''}
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
            onBlur={handleBlur}
            aria-invalid={Boolean(errors.category && touched.category)}
            className={errors.category && touched.category ? 'invalid' : ''}
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
          <div className="filter-row">
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
      </section>
    </section>
  );
}

export default SignUpForm;

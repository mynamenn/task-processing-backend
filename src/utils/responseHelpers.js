/**
 * Formats body validation errors into a single error message.
 *
 * @param {Result} errors - The result object returned from validationResult(req).
 * @returns {string} A single string containing all error messages.
 */
export function formatBodyValidationErrors(errors) {
  const errorMessages = errors.array().map((err) => err.path);

  return `The following fields are required: ${errorMessages.join(", ")}.`;
}

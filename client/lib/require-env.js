/**
 * Require environment variable - throws if not set
 * @param {string} key - Environment variable name
 * @returns {string} - Environment variable value
 */
export function requireEnv(key) {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

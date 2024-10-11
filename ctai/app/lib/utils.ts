export function randomString(length: number) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz"
  let result = ''
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}

export function toGETQueryString(data: any) {
  return Object.keys(data)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&');
}
// Function to safely parse cookies from a Set-Cookie header string
export function parseCookies(CookiesString: string) {

  let cookiesArray = CookiesString.split(', ')
    .map(cookie => cookie.split(';')[0]) // Take only the name=value part
    .filter(cookie => cookie.includes('=')); // Ensure it's a valid cookie pair

  // Concatenate all name=value pairs into a single string separated by ', '
  return cookiesArray.join('; ');

}
export const generateAuthcode = () =>
  Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");

export function identifyString(str: string) {
  const emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  const phonePattern = /^\d+$/;

  return {
    email: emailPattern.test(str),
    phone: phonePattern.test(str),
  };
}

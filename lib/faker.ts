/** Tiny built-in faker — no dependencies. Deterministic-ish randomness is fine for mocks. */

const FIRST_NAMES = [
  "Aarav", "Diya", "Kabir", "Meera", "Arjun", "Sana", "Vivaan", "Isha",
  "Rohan", "Priya", "Aditi", "Kiran", "Nisha", "Sagar", "Pooja", "Ramesh",
  "Anisha", "Bibek", "Sujata", "Nabin", "Prerana", "Sabin", "Ritu", "Aashish",
];

const LAST_NAMES = [
  "Sharma", "Thapa", "Gurung", "Karki", "Shrestha", "Adhikari", "Rai",
  "Tamang", "Khadka", "Poudel", "Singh", "Khanal", "Basnet", "Magar",
];

const WORDS = [
  "harbor", "lantern", "meadow", "compass", "ember", "willow", "cobalt",
  "sonar", "juniper", "pixel", "tundra", "marble", "zephyr", "onyx",
];

const DOMAINS = ["example.com", "mail.test", "demo.dev", "mockline.io"];

export function fakeInt(min = 0, max = 100): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function fakeUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const h = () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  const s = h() + h();
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-a${s.slice(17, 20)}-${s.slice(20, 32)}`;
}

export function fakeName(): string {
  return `${FIRST_NAMES[fakeInt(0, FIRST_NAMES.length - 1)]} ${LAST_NAMES[fakeInt(0, LAST_NAMES.length - 1)]}`;
}

export function fakeEmail(): string {
  const name = fakeName().toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
  return `${name}${fakeInt(1, 999)}@${DOMAINS[fakeInt(0, DOMAINS.length - 1)]}`;
}

export function fakeWord(): string {
  return WORDS[fakeInt(0, WORDS.length - 1)];
}

export function fakeBool(): boolean {
  return Math.random() < 0.5;
}

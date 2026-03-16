// Module for using the wonky endpoint

import { getEnvVariable } from "./utils.ts";

const BASE_URL = getEnvVariable("WONKY_ENDPOINT_URL");
const WONKY_API_KEY = getEnvVariable("WONKY_API_KEY");

export default async function getUsers() {
  // As of 2026-03-16, a temporary endpoint is used.
  // To prevent having to muck around later, I will keep this working for both the old and new endpoint.
  if (BASE_URL.includes("endearing-mercy")) {
    const response = await fetch(`${BASE_URL}?group=majeggstics`, {
      headers: {
        "x-api-key": `${WONKY_API_KEY}`
      }
    });
    return response.json();
  } else {
    const response = await fetch(BASE_URL)
    return response.json();
  }
}
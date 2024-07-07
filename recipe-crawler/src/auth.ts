import fetch, { Response, RequestInit } from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const {
  MEALIE_USER,
  MEALIE_PASS,
  MEALIE_HOST,
  MEALIE_PORT,
} = process.env;


export const BASE_URL = `http://${MEALIE_HOST}:${MEALIE_PORT}/api`;
const auth_token_response = await fetch(BASE_URL + '/auth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'accept': 'application/json'
  },
  body: `username=${MEALIE_USER}&password=${MEALIE_PASS}&remember_me=false`
});
const {access_token} = await auth_token_response.json() as { access_token: string };
export const BASE_HEADERS = {
  'content-type': 'application/json',
  'accept': 'application/json',
  'authorization': `bearer ${access_token}`
};

export function mfetch(route: string, options?: RequestInit): Promise<Response> {
  return fetch(BASE_URL + route, {
    ...options ?? {},
    headers: BASE_HEADERS,  
  });
}
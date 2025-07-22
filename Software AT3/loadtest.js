import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20, // 20 concurrent virtual users
  duration: '30s',
};

const BASE_URL = 'http://localhost:3000'; // change if running elsewhere

export default function () {
  // Test public routes
  let res = http.get(`${BASE_URL}/`);
  check(res, { '/ root loads': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/login`);
  check(res, { '/login loads': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/sign-up`);
  check(res, { '/sign-up loads': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/leagues`);
  check(res, { '/leagues loads': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/FAQ`);
  check(res, { '/FAQ loads': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/about`);
  check(res, { '/about loads': (r) => r.status === 200 });

  // Simulate visiting a league detail page with a fake ID
  res = http.get(`${BASE_URL}/leagues/123456`);
  check(res, { '/leagues/:id loads': (r) => r.status === 200 || r.status === 500 }); // allow failure handling

  sleep(1); // simulate user think time
}

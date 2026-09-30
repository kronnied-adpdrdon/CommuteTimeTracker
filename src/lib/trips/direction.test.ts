import { describe, expect, it } from 'vitest';
import { tagDirection } from './direction';

const home = { lat: 12.9, lng: 77.6 };
const office = { lat: 12.97, lng: 77.75 };
const places = { home, office };
const nearHome = { lat: 12.9009, lng: 77.6 }; // ~100 m away
const nearOffice = { lat: 12.97, lng: 77.7509 };
const farAway = { lat: 13.3, lng: 78.2 };

describe('tagDirection', () => {
  it('leaving home is a trip to work', () => {
    expect(tagDirection(nearHome, farAway, places)).toBe('work');
  });
  it('arriving at the office is a trip to work', () => {
    expect(tagDirection(farAway, nearOffice, places)).toBe('work');
  });
  it('leaving the office is a trip home', () => {
    expect(tagDirection(nearOffice, farAway, places)).toBe('home');
  });
  it('arriving home is a trip home', () => {
    expect(tagDirection(farAway, nearHome, places)).toBe('home');
  });
  it('home to office is work; office to home is home', () => {
    expect(tagDirection(home, office, places)).toBe('work');
    expect(tagDirection(office, home, places)).toBe('home');
  });
  it('is unknown when no places are saved', () => {
    expect(tagDirection(home, office, {})).toBe('unknown');
  });
  it('is unknown when the trip touches neither place', () => {
    expect(tagDirection(farAway, farAway, places)).toBe('unknown');
  });
  it('is unknown when start and end are missing', () => {
    expect(tagDirection(undefined, undefined, places)).toBe('unknown');
  });
  it('is unknown when the evidence contradicts itself', () => {
    // Starts at home and ends at home: a round trip.
    expect(tagDirection(home, home, places)).toBe('unknown');
  });
  it('works with only one place saved', () => {
    expect(tagDirection(nearHome, farAway, { home })).toBe('work');
    expect(tagDirection(farAway, nearHome, { home })).toBe('home');
  });
});

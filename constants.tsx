
import React from 'react';

export const APP_STORAGE_KEY = 'autojob_v1_state';

export const DEFAULT_PROFILE: any = {
  fullName: "John Doe",
  email: "john.doe@example.com",
  phone: "555-0123",
  linkedin: "linkedin.com/in/johndoe",
  portfolio: "johndoe.dev",
  resumeTracks: [
    {
      id: "frontend-track",
      name: "Senior Frontend Developer",
      content: {
        summary: "Senior Software Engineer with 8 years of experience in React and Node.js.",
        skills: ["React", "TypeScript", "Node.js", "AWS", "Tailwind"],
        experience: [
          {
            company: "Tech Giant Corp",
            role: "Senior Frontend Engineer",
            duration: "2020 - Present",
            achievements: ["Led migration to Microfrontends", "Improved CI/CD times by 40%"]
          }
        ],
        projects: [
          {
            name: "Open Source UI Lib",
            description: "A headless UI library for React.",
            technologies: ["React", "Tailwind", "Jest"]
          }
        ]
      }
    },
    {
      id: "fullstack-track",
      name: "Full Stack Engineer",
      content: {
        summary: "Versatile Full Stack Engineer focused on scalable architectures and high-performance APIs.",
        skills: ["Node.js", "PostgreSQL", "React", "Docker", "Python"],
        experience: [
          {
            company: "ScaleUp Systems",
            role: "Full Stack Engineer",
            duration: "2018 - 2020",
            achievements: ["Architected multi-tenant SaaS platform", "Optimized DB queries reducing latency by 60%"]
          }
        ],
        projects: [
          {
            name: "DevOps Dashboard",
            description: "Monitoring tool for distributed systems.",
            technologies: ["Golang", "InfluxDB", "Grafana"]
          }
        ]
      }
    }
  ],
  preferences: {
    targetRoles: ["Senior Software Engineer", "Staff Engineer", "Frontend Lead"],
    minSalary: "160k",
    locations: ["New York", "Remote"],
    remoteOnly: true,
    matchThreshold: 75,
    preferredPlatforms: ["LinkedIn", "Indeed", "Wellfound"]
  }
};

export const Icons = {
  Briefcase: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  History: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Alert: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
};

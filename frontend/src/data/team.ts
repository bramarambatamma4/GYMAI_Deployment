/**
 * EDIT THIS FILE: replace each entry with your real team member.
 *  - photo:  images live in frontend/public/team/ (member-1.jpg ... member-5.jpg are already there, 3:4 portraits).
 *            To change one, replace the file or point to a new one, e.g. '/team/priya.jpg'. Leave '' to show a silhouette.
 *  - badge:  the small gold line on top of the card (e.g. 'Team Lead').   focus: the big line (e.g. 'FULL STACK').
 *  - quote:  shown inside the circle when the card is opened.
 *  - linkedin / github: full profile URLs. Leave '' to hide an icon.
 */
export interface TeamMember {
  name: string
  role: string
  badge: string
  focus: string
  quote: string
  photo: string
  linkedin: string
  github: string
}

export const TEAM: TeamMember[] = [
  { name: 'DeepikaMadhuri', role: 'Project Director & Lead Architect', badge: 'Team lead', focus: '', quote: 'Details matter.', photo: '/team/member-1.jpg', linkedin: 'https://www.linkedin.com/in/deepika-madhuri-sriramsetty-216995328', github: 'https://github.com/sriramsettyDeepikamadhuri?tab=overview&from=2025-11-01&to=2025-11-30' },
  { name: 'Sushanth', role: 'Project Coordinator', badge: 'Coder', focus: '', quote: 'Simple code', photo: '/team/member-2.jpg', linkedin: 'https://www.linkedin.com/in/sushanth-vaddi-14179a321?utm_source=share_via&utm_content=profile&utm_medium=member_android', github: 'https://github.com/sushanth-web' },
  { name: 'Bramaramba', role: 'Project Coordinator', badge: 'Documentation', focus: '', quote: 'Useful content only', photo: '/team/member-3.jpg', linkedin: 'https://www.linkedin.com/in/bramaramba-tamma-97979a358?utm_source=share_via&utm_content=profile&utm_medium=member_android', github: 'https://github.com/bramarambatamma4' },
  { name: 'Kalpana', role: 'Project Coordinator', badge: 'Documentation', focus: '', quote: 'Useful content only', photo: '/team/member-4.jpg', linkedin: 'https://www.linkedin.com/in/kalpana-mekala-6871873b4', github: '' },
  { name: 'Venu', role: 'Project Coordinator', badge: 'Coder', focus: '', quote: 'Bringing designs', photo: '/team/member-5.jpg', linkedin: 'https://www.linkedin.com/in/venu-guduri-16ab29286?utm_source=share_via&utm_content=profile&utm_medium=member_android', github: 'https://github.com/Venu2809-ops' },
  { name: 'SreehithaReddy', role: 'Project Coordinator', badge: 'Documentation', focus: '', quote: 'Useful content only', photo: '', linkedin: 'https://www.linkedin.com/in/sreehitha-reddy-puli-aaaa582b0?utm_source=share_via&utm_content=profile&utm_medium=member_android', github: 'https://github.com/sreehithareddypuli05' },
]

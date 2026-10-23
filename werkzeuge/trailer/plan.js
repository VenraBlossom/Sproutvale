const E = { z0: 2.0, z1: 2.15, fx: 0.5, fy: 0.83 };
const M = { z0: 1.45, z1: 1.55, fx: 0.5, fy: 0.95 };

module.exports = [
  ["s_riesen", 0.9, 4, { z0: 1.0, z1: 1.14, fx: 0.25, fy: 0.55, stoss: 0 }],
  ["s_jackpot", 1.9, 2, { z: 1.25, fx: 0.4, fy: 0.45, wackeln: 30 }],
  ["s_weit", 0.6, 2, { z0: 1.45, z1: 1.0, fx: 0.5, fy: 0.6, stoss: 0 }],
  ["ende", 1.2, 4, { blitz: true, z0: 1.0, z1: 1.06, fy: 0.3 }],

  ["e_saat", 0.4, 4, { ...E }],
  ["e_wachsen", 2.7, 4, { ...E, tempo: 1.2 }],
  ["e_ernte", 0.5, 4, { ...E, z0: 2.1, z1: 2.3 }],
  ["e_saat", 2.3, 2, { ...E, z0: 2.2, z1: 2.4 }],
  ["e_feldkauf", 0.4, 3, { ...E, tempo: 1.4 }],
  ["e_neu", 0.4, 3, { z0: 1.75, z1: 1.9, fx: 0.5, fy: 0.72, stoss: 0.04 }],
  ["m_bezahlt", 0.1, 2, { z0: 1.3, z1: 1.4, fx: 0.5, fy: 0.42 }],
  ["m_kombo", 0.6, 2, { ...M }],

  ["m_kombo", 2.0, 4, { z0: 1.8, z1: 2.2, fx: 0.5, fy: 0.82 }],
  ["m_ernte", 0.4, 4, { ...M, tempo: 1.25 }],
  ["m_goldregen", 1.2, 4, { z0: 1.15, z1: 1.3, fx: 0.5, fy: 0.8 }],
  ["m_kraehen", 1.4, 3, { ...M, z0: 1.6, z1: 1.7 }],
  ["m_herbst", 0.3, 3, { ...M }],
  ["m_nacht", 1.0, 4, { ...M }],
  ["m_stellarium", 0.8, 3, { z0: 1.1, z1: 1.25, fx: 0.4, fy: 0.5, tempo: 2.0 }],
  ["s_fieber", 2.4, 3, { z0: 1.7, z1: 1.9, fx: 0.5, fy: 0.55 }],

  ["s_riesen", 2.3, 3, { z0: 1.1, z1: 1.2, fx: 0.7, fy: 0.6, blitz: 0.2 }],
  ["s_magnet", 0.3, 3, { z0: 1.15, z1: 1.25, fx: 0.8, fy: 0.5, tempo: 1.3 }],
  ["s_jackpot", 3.1, 2, { z: 1.3, fx: 0.55, fy: 0.5, wackeln: 30 }],
  ["s_winter", 0.5, 3, { z0: 1.1, z1: 1.2, fx: 0.5, fy: 0.55 }],
  ["s_gewitter", 0.6, 3, { z0: 1.1, z1: 1.22, fx: 0.4, fy: 0.6 }],
  ["s_stellarium", 1.0, 2, { z0: 1.0, z1: 1.15, fx: 0.4, fy: 0.5, tempo: 2.5 }],
  ["s_magnet", 4.3, 3, { z0: 1.0, z1: 1.1, fx: 0.5, fy: 0.5, halten: true }],
  ["s_jackpot", 2.0, 2, { z: 1.2, fx: 0.4, fy: 0.45, wackeln: 30 }],
  ["s_riesen", 3.4, 1, { z: 1.25, fx: 0.3, fy: 0.7 }],
  ["s_winter", 2.2, 1, { z: 1.25, fx: 0.6, fy: 0.6 }],
  ["s_gewitter", 2.6, 1, { z: 1.25, fx: 0.5, fy: 0.7 }],
  ["s_fieber", 4.3, 1, { z: 1.9, fx: 0.5, fy: 0.55 }],
  ["s_pokal", 0.25, 4, { z0: 1.7, z1: 2.0, fx: 0.5, fy: 0.5, blitz: true, halten: true }],
  ["s_weit", 1.5, 2, { z0: 1.0, z1: 1.08, fx: 0.5, fy: 0.5 }],

  ["ende", 0.6, 8, { blitz: 0.4, z0: 1.0, z1: 1.04, fy: 0.3, ende: true, stoss: 0 }]
];

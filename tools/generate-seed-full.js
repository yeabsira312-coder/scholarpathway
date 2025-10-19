// tools/generate-seed-full.js
// Generates supabase-seed-full.sql from data/mega-scholarships.js

const fs = require('fs');
const path = require('path');

function escapeSql(str) {
  if (str === null || typeof str === 'undefined') return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function arrayToSql(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "ARRAY[]::text[]";
  const items = arr.map(i => String(i).replace(/'/g, "''"));
  return "ARRAY['" + items.join("','") + "']";
}

function batchInsert(table, cols, rows, conflictCol) {
  if (!rows.length) return '';
  const batchSize = 200; // safe
  let sql = '';
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch.map(row => '(' + cols.map(c => row[c]).join(',') + ')').join(',\n  ');
    sql += `INSERT INTO ${table} (${cols.join(', ')}) VALUES\n  ${values}\nON CONFLICT (${conflictCol}) DO UPDATE SET\n`;
    sql += cols.filter(c => c !== conflictCol).map(c => `  ${c} = EXCLUDED.${c}`).join(',\n') + ';\n\n';
  }
  return sql;
}

(async function() {
  try {
    const data = require('../data/mega-scholarships');
    const scholarships = Array.isArray(data.scholarshipsDatabase) ? data.scholarshipsDatabase : [];

    // Build countries map from scholarships
    const countriesMap = new Map();
    scholarships.forEach(s => {
      const code = (s.country_code || (s.countries && s.countries.code) || '').toUpperCase();
      const name = (s.countries && s.countries.name) || s.country_name || code;
      if (!code) return;
      if (!countriesMap.has(code)) countriesMap.set(code, { code, name });
    });

    // Add names from known list in utils/countries.js
    try {
      const utilsCountries = require('../utils/countries').countriesList || [];
      utilsCountries.forEach(c => {
        const code = (c.code || '').toUpperCase();
        if (!countriesMap.has(code)) countriesMap.set(code, { code, name: c.name });
      });
    } catch (e) {
      // ignore
    }

    // Prepare country rows
    const countryRows = [];
    for (const [code, { code: cc, name }] of countriesMap) {
      countryRows.push({
        code: escapeSql(cc),
        name: escapeSql(name || cc),
        flag_emoji: escapeSql('')
      });
    }

    // Prepare scholarship rows
    const schRows = scholarships.map(s => {
      const slug = s.slug || s.title && s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || ('sch-' + (s.id || Math.random()).toString());
      const title = s.title || '';
      const summary = s.summary || '';
      const content = s.content || null;
      const country_code = (s.country_code || (s.countries && s.countries.code) || '').toUpperCase() || null;
      const degree_levels = Array.isArray(s.degree_levels) ? s.degree_levels : (s.degree_levels ? [s.degree_levels] : []);
      const tags = Array.isArray(s.tags) ? s.tags.map(t => String(t)) : (s.tags ? [String(s.tags)] : []);
      const deadline = s.deadline ? `to_timestamp(${Math.floor(new Date(s.deadline).getTime()/1000)})` : 'NULL';
      const amount = s.amount || null;
      const featured = s.featured ? 'true' : 'false';
      const is_published = (typeof s.is_published === 'undefined') ? 'true' : (s.is_published ? 'true' : 'false');
      const official_link = s.official_link || null;
      const created_at = s.created_at ? `to_timestamp(${Math.floor(new Date(s.created_at).getTime()/1000)})` : 'NOW()';

      return {
        slug: escapeSql(slug),
        title: escapeSql(title),
        summary: escapeSql(summary),
        content: content ? escapeSql(content) : 'NULL',
        country_code: country_code ? escapeSql(country_code) : 'NULL',
        degree_levels: degree_levels.length ? arrayToSql(degree_levels) : "ARRAY[]::text[]",
        deadline: deadline,
        amount: amount ? escapeSql(amount) : 'NULL',
        tags: tags.length ? arrayToSql(tags) : "ARRAY[]::text[]",
        featured,
        is_published,
        official_link: official_link ? escapeSql(official_link) : 'NULL',
        created_at,
        updated_at: 'NOW()'
      };
    });

    // Build SQL
    let out = '-- supabase-seed-full.sql\n-- Generated from data/mega-scholarships.js (full dataset)\n\nBEGIN;\n\n';

    // Countries
    if (countryRows.length) {
      const cols = ['code','name','flag_emoji'];
      const rows = countryRows.map(r => ({ code: r.code, name: r.name, flag_emoji: r.flag_emoji }));
      out += batchInsert('countries', cols, rows, 'code');
    }

    // Scholarships
    if (schRows.length) {
      const cols = ['slug','title','summary','content','country_code','degree_levels','deadline','amount','tags','featured','is_published','official_link','created_at','updated_at'];
      // convert each schRows element values into SQL-friendly strings/expressions for each column
      const rows = schRows.map(s => {
        return cols.reduce((acc, c) => { acc[c] = s[c]; return acc; }, {});
      });
      out += batchInsert('scholarships', cols, rows, 'slug');
    }

    out += '\nCOMMIT;\n\n-- End of seed file\n';

    const outPath = path.join(__dirname, '..', 'supabase-seed-full.sql');
    fs.writeFileSync(outPath, out, 'utf8');
    console.log('Generated', outPath, 'with', countryRows.length, 'countries and', schRows.length, 'scholarships');
  } catch (err) {
    console.error('Failed to generate seed:', err);
    process.exit(1);
  }
})();

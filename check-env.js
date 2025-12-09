/**
 * Environment Variables Checker
 * Validates all required environment variables for the project
 * 
 * Usage: node check-env.js
 */

require('dotenv').config();

function checkEnvironment() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 ENVIRONMENT VARIABLES VALIDATION');
  console.log('='.repeat(70) + '\n');

  const variables = [
    {
      name: 'DATABASE_URL',
      description: 'PostgreSQL connection string',
      critical: true,
      validate: (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
      example: 'postgresql://user:password@host:5432/database'
    },
    {
      name: 'TWITCH_CLIENT_ID',
      description: 'Twitch application client ID',
      critical: true,
      validate: (val) => val.length >= 20,
      example: 'abc123xyz456...'
    },
    {
      name: 'TWITCH_CLIENT_SECRET',
      description: 'Twitch application client secret',
      critical: true,
      validate: (val) => val.length >= 20,
      example: 'def456uvw789...'
    },
    {
      name: 'TWITCH_BOT_USERNAME',
      description: 'Twitch bot username (lowercase)',
      critical: true,
      validate: (val) => val === val.toLowerCase() && val.length > 0,
      example: 'yourbotname'
    },
    {
      name: 'TWITCH_OAUTH_TOKEN',
      description: 'Twitch OAuth token for bot',
      critical: true,
      validate: (val) => val.startsWith('oauth:'),
      example: 'oauth:abcdefgh123456789'
    },
    {
      name: 'TWITCH_CHANNEL',
      description: 'Default Twitch channel (lowercase)',
      critical: true,
      validate: (val) => val === val.toLowerCase() && val.length > 0,
      example: 'yourchannel'
    },
    {
      name: 'SESSION_SECRET',
      description: 'Express session secret (32+ chars)',
      critical: true,
      validate: (val) => val.length >= 32,
      example: 'generate-a-long-random-string-here-32chars+'
    },
    {
      name: 'NODE_ENV',
      description: 'Environment mode',
      critical: false,
      validate: (val) => ['production', 'development', 'test'].includes(val),
      example: 'production or development'
    },
    {
      name: 'CLIENT_URL',
      description: 'Frontend URL for CORS',
      critical: false,
      validate: (val) => val.startsWith('http://') || val.startsWith('https://'),
      example: 'https://your-app.up.railway.app'
    },
    {
      name: 'PORT',
      description: 'Server port (Railway auto-sets)',
      critical: false,
      validate: (val) => !isNaN(parseInt(val)),
      example: '3000'
    }
  ];

  const results = {
    critical: { passed: [], failed: [], warnings: [] },
    optional: { passed: [], failed: [], warnings: [] }
  };

  // Check each variable
  variables.forEach(variable => {
    const value = process.env[variable.name];
    const isSet = value && value.trim() !== '';
    const category = variable.critical ? 'critical' : 'optional';

    if (!isSet) {
      console.log(`${variable.critical ? '❌' : '⚠️ '} ${variable.name.padEnd(25)} MISSING`);
      console.log(`   └─ ${variable.description}`);
      console.log(`   └─ Example: ${variable.example}\n`);
      results[category].failed.push(variable);
    } else {
      // Validate format if validator exists
      const isValid = variable.validate ? variable.validate(value) : true;
      
      if (!isValid) {
        console.log(`⚠️  ${variable.name.padEnd(25)} INVALID FORMAT`);
        console.log(`   └─ ${variable.description}`);
        console.log(`   └─ Expected: ${variable.example}`);
        
        // Show current value (masked for sensitive data)
        let displayValue = value;
        if (['TWITCH_CLIENT_SECRET', 'TWITCH_OAUTH_TOKEN', 'SESSION_SECRET', 'DATABASE_URL'].includes(variable.name)) {
          displayValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
        }
        console.log(`   └─ Current: ${displayValue}\n`);
        results[category].warnings.push(variable);
      } else {
        // Mask sensitive values
        let displayValue = value;
        if (['TWITCH_CLIENT_SECRET', 'TWITCH_OAUTH_TOKEN', 'SESSION_SECRET', 'DATABASE_URL'].includes(variable.name)) {
          displayValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
        } else if (value.length > 40) {
          displayValue = value.substring(0, 40) + '...';
        }
        
        console.log(`✅ ${variable.name.padEnd(25)} ${displayValue}`);
        results[category].passed.push(variable);
      }
    }
  });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));

  const totalCritical = results.critical.passed.length + results.critical.failed.length + results.critical.warnings.length;
  const totalOptional = results.optional.passed.length + results.optional.failed.length + results.optional.warnings.length;

  console.log(`\n🔴 Critical Variables: ${results.critical.passed.length}/${totalCritical} configured`);
  if (results.critical.failed.length > 0) {
    console.log(`   ❌ Missing: ${results.critical.failed.length}`);
  }
  if (results.critical.warnings.length > 0) {
    console.log(`   ⚠️  Invalid: ${results.critical.warnings.length}`);
  }

  console.log(`\n🟡 Optional Variables: ${results.optional.passed.length}/${totalOptional} configured`);
  if (results.optional.failed.length > 0) {
    console.log(`   ⚠️  Missing: ${results.optional.failed.length}`);
  }
  if (results.optional.warnings.length > 0) {
    console.log(`   ⚠️  Invalid: ${results.optional.warnings.length}`);
  }

  console.log('\n' + '='.repeat(70));

  // Final verdict
  if (results.critical.failed.length > 0 || results.critical.warnings.length > 0) {
    console.log('❌ CRITICAL ISSUES FOUND - Application may not work properly');
    console.log('\nAdd missing variables to your .env file (local) or Railway dashboard (production)');
    console.log('='.repeat(70) + '\n');
    return false;
  } else if (results.optional.failed.length > 0 || results.optional.warnings.length > 0) {
    console.log('⚠️  WARNINGS - Application will work but some features may be limited');
    console.log('='.repeat(70) + '\n');
    return true;
  } else {
    console.log('✅ ALL ENVIRONMENT VARIABLES PROPERLY CONFIGURED!');
    console.log('='.repeat(70) + '\n');
    return true;
  }
}

// Run the check
const isValid = checkEnvironment();
process.exit(isValid ? 0 : 1);

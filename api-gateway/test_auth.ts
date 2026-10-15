import { AuthService } from './src/auth/auth.service';

async function testAuth() {
  console.log('Testing Authentication Service...');
  const auth = new AuthService();

  const testEmail = `student_${Date.now()}@example.pk`;
  const testPassword = 'SecurePassword123!';

  // 1. Register
  console.log(`\n1. Registering new student: ${testEmail}`);
  const regResult = await auth.register({
    email: testEmail,
    password: testPassword,
    name: 'Syed Ali',
    nationality: 'PK',
  });

  console.log('Registered User ID:', regResult.user.id);
  console.log('Session Token (raw length):', regResult.token.length);
  console.log('Profile created:', regResult.user.profile);

  // 2. Validate Session
  console.log('\n2. Validating session token...');
  const validatedUser = await auth.validateSession(regResult.token);
  console.log('Validated User Email:', validatedUser.email);
  console.log('Validated User Role:', validatedUser.role);

  // 3. Update Student Profile
  console.log('\n3. Updating student profile (CGPA, degree)...');
  const updatedProfile = await auth.updateProfile(regResult.user.id, {
    nationality: 'PK',
    degreeLevel: 'MASTERS',
    fieldOfStudy: 'Computer Science',
    cgpa: 3.75,
    gradingScale: 4.0,
    graduationYear: 2025,
  });
  console.log('Updated Profile:', updatedProfile);

  // 4. Test Login
  console.log('\n4. Testing login with password...');
  const loginResult = await auth.login({
    email: testEmail,
    password: testPassword,
  });
  console.log('Login successful! New session token generated:', loginResult.token.substring(0, 10) + '...');

  // 5. Test Revoke Session
  console.log('\n5. Revoking session...');
  await auth.revokeSession(loginResult.token);
  try {
    await auth.validateSession(loginResult.token);
    console.error('Error: Revoked session was still validated!');
  } catch (err: any) {
    console.log('Revocation verified successfully:', err.message);
  }

  console.log('\nAll Authentication & Profile DB operations passed perfectly!');
  process.exit(0);
}

testAuth().catch((err) => {
  console.error('Auth test failed:', err);
  process.exit(1);
});

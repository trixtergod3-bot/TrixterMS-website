import { spawn } from 'node:child_process';
import { isAbsolute } from 'node:path';

// Spawn only an operator-configured JVM. Passwords never enter argv or a file.
export function javaWriter(env) {
  if (!isAbsolute(env.REGISTRATION_JAVA ?? '') || !env.REGISTRATION_JAVA_CLASSPATH)
    throw new Error('Private Java writer configuration required');
  let active = 0;
  return async (username, password) => {
    if (active >= 4) throw new Error('Writer busy');
    active++;
    try {
      return await new Promise((resolve, reject) => {
        const child = spawn(env.REGISTRATION_JAVA,
          ['-cp', env.REGISTRATION_JAVA_CLASSPATH, 'handling.login.RegistrationGatewayWriter'], {
            windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'ignore'],
            env: { SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP,
              REGISTRATION_DB_NAME: env.REGISTRATION_DB_NAME,
              REGISTRATION_DB_USER: env.REGISTRATION_DB_USER,
              REGISTRATION_DB_PASSWORD: env.REGISTRATION_DB_PASSWORD,
              REGISTRATION_DB_PORT: env.REGISTRATION_DB_PORT ?? '3306' },
          });
        let output = '', failed = false;
        const fail = () => { failed = true; child.kill(); reject(new Error('Private writer unavailable')); };
        const timer = setTimeout(fail, 7000);
        child.once('error', fail);
        child.stdin.on('error', fail);
        child.stdout.on('data', chunk => {
          if (output.length + chunk.length > 64) fail();
          else output += chunk.toString('ascii');
        });
        child.once('close', code => {
          clearTimeout(timer);
          if (failed) return;
          const allowed = { SUCCESS: 'created', USERNAME_TAKEN: 'duplicate' };
          if (code !== 0 || !Object.hasOwn(allowed, output)) return fail();
          resolve(allowed[output]);
        });
        child.stdin.end(`${username}\n${password}\n${password}`);
      });
    } finally { active--; }
  };
}

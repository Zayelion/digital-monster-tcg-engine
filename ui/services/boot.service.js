import { userAlert } from './modal';
import { hey, listen } from './listener.service';
import { cardStackSort } from '../util/cardManipulation';
import { getJSON, postJSON } from '../util/fetch';

function validateEmail(email) {
  var re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email.toLowerCase());
}

function wireRegisterAccount() {
  listen('REGISTER_ACCOUNT', async ({ username, email, password, repeatedPassword }) => {
    if (password.length < 7) {
      userAlert('Stronger Password Required');
      return false;
    }

    if (repeatedPassword !== password) {
      userAlert('Passwords do not match');
      return false;
    }

    if (!validateEmail(email)) {
      userAlert('Invalid Email address');
      return false;
    }

    const result = await postJSON('/user/register', { email, username, password });

    if (result.error) {
      userAlert(result.error);
    } else {
      userAlert('Account Created. Please check your email.');
      hey({ action: 'OPEN_LOGIN' });
    }
  });
}

function wireRecoverAccount() {
  listen('RECOVER_ACCOUNT', async ({ email }) => {
    if (!validateEmail(email)) {
      userAlert('Invalid Email address');
      return false;
    }

    const result = await postJSON('/user/recover', { email: email });

    if (result.error) {
      userAlert(result.error);
    } else {
      userAlert('Recovery Code Sent.');
    }
  });

  listen('RECOVER_CODE', async ({ recoveryPass }) => {
    const result = await postJSON('/user/recoverpassword', { recoveryPass });

    if (result.error) {
      userAlert(result.error);
    } else {
      userAlert('Account Password Updated.');
    }
  });

  listen('LOGIN', async ({ username, password }) => {
    const result = await postJSON('/user/login', { username, password });

    if (result.error) {
      userAlert(result.error);
    } else {
      userAlert('Account Password Updated.');
    }
  });
}



export async function boot() {
  wireRegisterAccount();
  wireRecoverAccount();


  hey({ action: 'LOAD_LOGIN' });
}

export function postJSON(url, data) {
    return new Promise((resolve, reject) => {
        fetch(url, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify(data)
        }).then((response) => {
            return response.json();
        }).then((response) => {
            resolve(JSON.stringify(response));
        }).catch(reject);
    });
}

export function getJSON(url) {
    return new Promise((resolve, reject) => {
        fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        }).then((response) => {
            return response.json();
        }).then((data) => {
            console.log(data);

            resolve(data);
        }).catch(reject);
    });
}
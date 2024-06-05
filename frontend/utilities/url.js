export function setQueryParam(param, value) {
    var searchParams = new URLSearchParams(window.location.search);

    if (value === "") {
        searchParams.delete(param);
    } else {
        searchParams.set(param, value);
    }

    var newRelativePathQuery = window.location.pathname + '?' + searchParams.toString();
    history.replaceState(null, '', newRelativePathQuery);
}
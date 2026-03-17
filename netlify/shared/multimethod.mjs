export function defmulti(dispatchFn) {
    const methods = {};

    function multi(...args) {
        const key = dispatchFn(...args);
        const method = methods[key];
        if (!method) throw new Error(`No method for dispatch value: ${key}`);
        return method(...args);
    }

    multi.defmethod = (dispatchValue, fn) => {
        methods[dispatchValue] = fn;
    };

    return multi;
}

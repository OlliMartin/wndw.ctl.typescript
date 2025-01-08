class Option<T> {
    private constructor(private value: T | null) {
    }

    static Some<T>(value: T): Option<T> {
        if (value === null || value === undefined) {
            throw new Error("Cannot create Some with null or undefined");
        }
        return new Option(value);
    }

    static None<T>(): Option<T> {
        return new Option<T>(null);
    }

    isSome(): boolean {
        return this.value !== null;
    }

    isNone(): boolean {
        return this.value === null;
    }

    match<U>(someFn: (value: T) => U, noneFn: () => U): U {
        if (this.isSome()) {
            return someFn(this.value as T);
        } else {
            return noneFn();
        }
    }

    getOrElse(defaultValue: T): T {
        return this.isSome() ? (this.value as T) : defaultValue;
    }

    map<U>(fn: (value: T) => U): Option<U> {
        if (this.isSome()) {
            return Option.Some(fn(this.value as T));
        } else {
            return Option.None<U>();
        }
    }

    flatMap<U>(fn: (value: T) => Option<U>): Option<U> {
        if (this.isSome()) {
            return fn(this.value as T);
        } else {
            return Option.None<U>();
        }
    }
}

export default Option;
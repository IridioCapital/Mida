#pragma once
#include "../strings/MidaString.h"
#include "../vectors/MidaVector.h"

namespace Mida {
	template <class T = long double, class U = long double>
	class MidaIndicator {
		private:

        MidaString& name;
		MidaVector<T>& input;
        MidaVector<U>& output;

		public:

        MidaIndicator ();
        MidaIndicator (const char* name);
		MidaIndicator (const MidaString& name);
        ~MidaIndicator ();

		const MidaVector<U>& feed (const MidaVector<T>& values);
        const MidaVector<U>& feed (const T& value);

        const MidaString& getName () const;

        MidaVector<T>& getInput () const;
        long int getInputLength () const;

        MidaVector<U>& getOutput () const;
        long int getOutputLength () const;

        U operator [] (long int index) const;

        protected:

        virtual void compute () = 0;
	};

    template <class T, class U>
    MidaIndicator<T, U>::MidaIndicator()
        : name(*new MidaString("")), input(*new MidaVector<T>()), output(*new MidaVector<T>()){
        this -> input = *new MidaVector<T>();
        this -> output = *new MidaVector<T>();
    }

    template <class T, class U>
    MidaIndicator<T, U>::MidaIndicator(const MidaString& name)
        : name(*new MidaString(name)), input(*new MidaVector<T>()), output(*new MidaVector<T>()) {
    }

    template <class T, class U>
    MidaIndicator<T, U>::MidaIndicator(const char* name) {
        this -> name = *new MidaString(name);
        this -> input = *new MidaVector<T>();
        this -> output = *new MidaVector<T>();
    }

    template <class T, class U>
    MidaIndicator<T, U>::~MidaIndicator() {

    }

    template <class T, class U>
    const MidaVector<U>& MidaIndicator<T, U>::feed (const MidaVector<T> &values) {
        const long int length = values.getLength();
        MidaVector<T>& currentInput = this -> input;

        for (unsigned int i = 0; i < length; ++i) {
            currentInput.push(values[i]);
        }

        this -> compute();

        return this -> output;
    }

    template <class T, class U>
    const MidaVector<U>& MidaIndicator<T, U>::feed (const T& value) {
        this -> input.push(value);
        this -> compute();

        return this -> output;
    }

    template <class T, class U>
    const MidaString& MidaIndicator<T, U>::getName() const {
        return this -> name;
    }

    template <class T, class U>
    long int MidaIndicator<T, U>::getInputLength () const {
        return this -> input.getLength();
    }

    template <class T, class U>
    MidaVector<T>& MidaIndicator<T, U>::getInput () const {
        return this -> input;
    }

    template <class T, class U>
    long int MidaIndicator<T, U>::getOutputLength () const {
        return this -> output.getLength();
    }

    template <class T, class U>
    MidaVector<U>& MidaIndicator<T, U>::getOutput () const {
        return this -> output;
    }

    template <class T, class U>
    U MidaIndicator<T, U>::operator [] (long int index) const {
        return this -> output[index];
    }
}
#include "../strings/MidaString.h"
#include "../vectors/MidaVector.h"

namespace Mida {
	template <class T = long double>
	class MidaIndicator {
		private:

        MidaString& name;
		MidaVector<T>& input;
        MidaVector<T>& output;

		public:

        MidaIndicator ();
        MidaIndicator (const char* name);
		MidaIndicator (const MidaString& name);
        ~MidaIndicator ();

		const MidaVector<T>& feed (const MidaVector<T>& values);

        const MidaString& getName () const;

        MidaVector<T>& getInput () const;
        long int getInputLength () const;

        MidaVector<T>& getOutput () const;
        long int getOutputLength () const;

        T operator [] (long int index) const;

        protected:

        virtual void compute () = 0;
	};

    template <class T>
    MidaIndicator<T>::MidaIndicator()
        : name(*new MidaString("")), input(*new MidaVector<T>()), output(*new MidaVector<T>()){
        this -> input = *new MidaVector<T>();
        this -> output = *new MidaVector<T>();
    }

    template <class T>
    MidaIndicator<T>::MidaIndicator(const MidaString& name)
        : name(*new MidaString(name)), input(*new MidaVector<T>()), output(*new MidaVector<T>()) {
    }

    template <class T>
    MidaIndicator<T>::MidaIndicator(const char* name) {
        this -> name = *new MidaString(name);
        this -> input = *new MidaVector<T>();
        this -> output = *new MidaVector<T>();
    }

    template <class T>
    MidaIndicator<T>::~MidaIndicator() {

    }

    template <class T>
    const MidaVector<T>& MidaIndicator<T>::feed (const MidaVector<T> &values) {
        const long int length = values.getLength();
        MidaVector<T>& currentInput = this -> input;

        for (unsigned int i = 0; i < length; ++i) {
            currentInput.push(values[i]);
        }

        this -> compute();

        return this -> output;
    }

    template<class T>
    const MidaString& MidaIndicator<T>::getName() const {
        return this -> name;
    }

    template <class T>
    long int MidaIndicator<T>::getInputLength () const {
        return this -> input.getLength();
    }

    template <class T>
    MidaVector<T>& MidaIndicator<T>::getInput () const {
        return this -> input;
    }

    template <class T>
    long int MidaIndicator<T>::getOutputLength () const {
        return this -> output.getLength();
    }

    template <class T>
    MidaVector<T>& MidaIndicator<T>::getOutput () const {
        return this -> output;
    }

    template <class T>
    T MidaIndicator<T>::operator [] (long int index) const {
        return this -> output[index];
    }
}
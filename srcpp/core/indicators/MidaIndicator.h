#include "../strings/MidaString.h"
#include "../vectors/MidaVector.h"

namespace Mida {
	template <class T = long double>
	class MidaIndicator {
		private:

        const MidaString& name;
		const MidaVector<T>& input;
        const MidaVector<T>& output;

		public:

        MidaIndicator ();
        MidaIndicator (const char* name);
		MidaIndicator (const MidaString& name);
        ~MidaIndicator ();

		virtual MidaVector<T>& feed (MidaVector<T>& values) = 0;

        const MidaString& getName () const;

        const MidaVector<T>& getInput () const;
        long int getInputLength () const;

        const MidaVector<T>& getOutput () const;
        long int getOutputLength () const;
	};

    template <class T>
    MidaIndicator<T>::MidaIndicator() {
        this -> name = new MidaString();
        this -> input = *new MidaVector<T>();
        this -> output = *new MidaVector<T>();
    }

    template <class T>
    MidaIndicator<T>::MidaIndicator(const MidaString& name) {
        this -> name = name;
        this -> input = *new MidaVector<T>();
        this -> output = *new MidaVector<T>();
    }

    template <class T>
    MidaIndicator<T>::MidaIndicator(const char* name) {
        this -> name = new MidaString(name);
        this -> input = *new MidaVector<T>();
        this -> output = *new MidaVector<T>();
    }

    template <class T>
    MidaIndicator<T>::~MidaIndicator() {
        delete this -> input;
        delete this -> output;
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
    const MidaVector<T>& MidaIndicator<T>::getInput () const {
        return this -> input;
    }

    template <class T>
    long int MidaIndicator<T>::getOutputLength () const {
        return this -> output.getLength();
    }

    template <class T>
    const MidaVector<T>& MidaIndicator<T>::getOutput () const {
        return this -> outputs;
    }
}
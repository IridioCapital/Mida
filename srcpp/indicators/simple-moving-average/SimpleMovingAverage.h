#include "../../core/indicators/MidaIndicator.h"

namespace Mida {
    template <class T = long double>
	class SimpleMovingAverage : public MidaIndicator<T> {
		private:

		long int length;
        long int pivotIndex;

		public:

		SimpleMovingAverage ();
		SimpleMovingAverage (const long int length);

		long int getLength () const;

        protected:

        void compute ();
    };

    template <class T>
    SimpleMovingAverage<T>::SimpleMovingAverage () {
        this -> length = 14;
        this -> pivotIndex = 0;
    }

    template <class T>
    SimpleMovingAverage<T>::SimpleMovingAverage (const long int length) {
        this -> length = length;
        this -> pivotIndex = 0;
    }

    template <class T>
    long int SimpleMovingAverage<T>::getLength () const {
        return this -> length;
    }

    template <class T>
    void SimpleMovingAverage<T>::compute () {
        const MidaVector<T>& currentInput = this -> getInput();
        const long int currentInputLength = currentInput.getLength();

        const long int periodsLength = this -> length;
        long int currentPivotIndex = this -> pivotIndex;

        while (currentPivotIndex + periodsLength <= currentInputLength) {
            long int i = currentPivotIndex;
            T pivotAccumulator = 0;

            for (; i < currentPivotIndex + periodsLength; ++i) {
                pivotAccumulator += currentInput[i];
            }

            currentPivotIndex = i;
            this -> getOutput().push(pivotAccumulator / periodsLength);
        }

        this -> pivotIndex = currentPivotIndex;
    }
}

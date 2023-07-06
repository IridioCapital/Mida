#include "../../core/indicators/MidaIndicator.h"

namespace Mida {
	class SimpleMovingAverage : public MidaIndicator<long double> {
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
}

#include "MidaIndicator.h"

namespace Mida {
    template <class T = long double>
	class SimpleMovingAverage<T> : public MidaIndicator<T> {
		private:

		const int length;

		public:

		SimpleMovingAverage ();
		SimpleMovingAverage (const int length);

		int getLength () const;
	}
}

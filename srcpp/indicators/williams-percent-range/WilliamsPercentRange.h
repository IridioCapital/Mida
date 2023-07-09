#include "../../core/indicators/MidaIndicator.h"
#include "../../core/vectors/MidaVector.h"

namespace Mida::Indicators {
    class WilliamsPercentRange : public MidaIndicator<const MidaVector<long double>*, long double> {
        private:

        long int length;
        long int pivotIndex;

        public:

        WilliamsPercentRange ();
        WilliamsPercentRange (const long int length);

        long int getLength () const;

        protected:

        void compute ();
    };
}

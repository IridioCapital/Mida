#include "../../core/indicators/MidaIndicator.h"
#include "../../core/vectors/MidaVector.h"

namespace Mida::Indicators {
    class WilliamsPercentRange : public MidaIndicator<MidaVector<long double>*, long double> {
        private:

        long int length;
        long int pivotIndex;

        public:

        WilliamsPercentRange ();
        WilliamsPercentRange (const long int length);

        const MidaVector<long double>&
        feed (const long double& high, const long double& low, const long double& close);

        long int getLength () const;

        protected:

        void compute () override;
    };
}

#include <iostream>
#include "indicators/williams-percent-range/WilliamsPercentRange.h"
#include "core/vectors/MidaVector.h"

using namespace Mida;
using namespace Mida::Indicators;

using namespace std;

int main () {
    /**
     * Testing Indicators
     */
    WilliamsPercentRange& a = *new WilliamsPercentRange(2);

    cout << a.getLength() << '\n';
    cout << "Output Length => " << a.getOutputLength() << '\n';

    a.feed(100, 200, 200);
    a.feed(100, 200, 200);

    cout << "Output Length => " << a.getOutputLength() << '\n';

    a.feed(100, 200, 200);
    a.feed(100, 200, 200);

    cout << "Output Length => " << a.getOutputLength() << '\n';
    cout << "Output 0 => " << a[0] << '\n';
    cout << "Output 1 => " << a[1] << '\n';
    cout << "Output 1 => " << a[2] << '\n';

    return 0;
}
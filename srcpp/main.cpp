#include <iostream>
#include "indicators/simple-moving-average/SimpleMovingAverage.h"
#include "core/vectors/MidaVector.h"

using namespace Mida;
using namespace std;

int main () {
    /**
     * Testing Indicators
     */
    SimpleMovingAverage& a = *new SimpleMovingAverage(2);

    cout << a.getLength() << '\n';
    cout << "Output Length => " << a.getOutputLength() << '\n';

    a.feed(100);
    a.feed(100);

    cout << "Output Length => " << a.getOutputLength() << '\n';

    a.feed(1000);
    a.feed(2000);

    cout << "Output Length => " << a.getOutputLength() << '\n';
    cout << "Output 0 => " << a[0] << '\n';
    cout << "Output 1 => " << a[1] << '\n';
    cout << "Output 1 => " << a[2] << '\n';

    return 0;
}
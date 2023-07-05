#include <iostream>
#include "indicators/simple-moving-average/SimpleMovingAverage.h"
#include "core/vectors/MidaVector.h"

using namespace Mida;
using namespace std;

int main () {
    /**
     * Testing Indicators
     */
    SimpleMovingAverage<int>& a = *new SimpleMovingAverage<int>(2);

    cout << a.getLength() << '\n';
    cout << "Output Length => " << a.getOutputLength() << '\n';

    MidaVector<int>& input = *new MidaVector<int>();

    input.push(100);
    input.push(100);

    a.feed(input);

    cout << "Output Length => " << a.getOutputLength() << '\n';





    MidaVector<int>& input2 = *new MidaVector<int>();

    input2.push(1000);
    input2.push(2000);

    a.feed(input2);

    cout << "Output Length => " << a.getOutputLength() << '\n';
    cout << "Output 0 => " << a[0] << '\n';
    cout << "Output 1 => " << a[1] << '\n';

    return 0;
}
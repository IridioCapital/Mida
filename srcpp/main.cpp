#include <iostream>
#include "core/strings/MidaString.h"

using Mida::MidaString;

int main () {
    MidaString* hi = new MidaString("Mida");

    std::cout << hi -> getLength() << '\n';

    MidaString* firstChar = &hi[0];

    //*hi = hi->removeAt(0);

    std::cout << hi -> get() << '\n';
    std::cout << hi -> getLength() << '\n';

    std::cout << firstChar -> getLength();

    return 0;
}
#include "MidaString.h";

using namespace Mida;

MidaString::MidaString() {
	this -> array = new char[1];
	this -> array[0] = '\0';
}

MidaString::MidaString(char* array) {
	if (array == nullptr) {
		this -> array = new char[1];
		this -> array[0] = '\0';	
	}
	else {
		unsigned int length = charArrayLength(array);
		char* extendedArray = new char[length + 1];

		for (unsigned int i = 0; i < length; ++i) {
			extendedArray[i] = array[i];
		}

		extendedArray[length] = '\0';
	}
}
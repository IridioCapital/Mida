cmake_minimum_required(VERSION 3.25)
project(Mida)

set(CMAKE_CXX_STANDARD 17)

include_directories(core/vectors)

add_executable(srcpp
        core/vectors/MidaVector.cpp
        core/vectors/MidaVector.h
        main.cpp core/indicators/MidaIndicator.h core/vectors/MidaVector2.h core/strings/MidaString.cpp indicators/simple-moving-average/SimpleMovingAverage.cpp)

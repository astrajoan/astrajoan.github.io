---
layout: post
title: Storing Reference in STL Container
date: 2023-12-12 18:01:31 -0700
category: C++
author: 🍓
---

Sometimes we might want to store a reference to some variable or object in an
STL container, but there are some challenges that we need to solve first. The
key challenge with using references directly in a container is that references
must be initialized when they are created and cannot be reseated to refer to a
different object later. This requires the need to use `std::reference_wrapper`
from the `<functional>` header to store references.

`std::reference_wrapper` is a class template that provides a way to store
references in a way that can be copied and assigned, like regular objects. This
makes it suitable for use in standard containers.

### first example

```cpp
#include <map>
#include <functional>

void f() {
    int a = 10, b = 20;

    // Create a map with int keys and reference_wrapper values
    std::map<int, std::reference_wrapper<int>> myMap;
    
    myMap[1] = a;
    myMap[2] = b;
    
    // Access and modify the values through the map
		myMap[1].get() = 11;
    myMap[2].get() += 5;  // Increments 'b' by 5
}
```

Some caveats:

- accessing the reference: To access the underlying reference, we need to use
  the `get()` member function of `std::reference_wrapper`
- assignment and modification: Assigning to a `reference_wrapper` stored in a
  map will change what the wrapper refers to, not the value of the referenced
  object. So to modify the value of the referenced object, it must be accessed
  with `get()`

### second example

In this example, we have a class `A` with some private members, and we have a
class `B` where we have a `std::map` which stores the mapping between the member
variable names of `A` in the format of string to references to these variables:

```cpp
class A {
public:
    int x;

    A() : x(0) {}
    void registerWithB(class B& b, const std::string& name);
};

void A::registerWithB(B& b, const std::string& name) {
    b.registerVar(name, x);
}

class B {
public:
    std::map<std::string, std::reference_wrapper<int>> map;

    void registerVar(const std::string& name, int& var) {
        map[name] = std::ref(var);
    }
};
```

### why we need it

References themselves cannot be directly stored in standard containers like
`std::map`, because they are not objects and don't have their own identity and
can't be reassigned once initialized. `std::reference_wrapper` is a class
template that encapsulates references in a way that allows them to be stored in
containers, copied, and reassigned.

When assigning a raw reference to a `std::reference_wrapper`, the
`std::reference_wrapper` needs to be constructed explicitly. `std::ref` is a
function template that creates an `std::reference_wrapper` from a reference. In
the below code:

```cpp
map[name] = std::ref(var);
```

- `var` is a reference to an `int`
- `std::ref(var)` creates an `std::reference_wrapper<int>` that wraps around the
  reference to `var`
- The `std::reference_wrapper<int>` can now be stored in the map

Without `std::ref`, we would be trying to assign a raw reference to a map entry
that expects an `std::reference_wrapper`, which is not directly possible. The
compiler needs `std::ref` to understand that we are trying to create a
`std::reference_wrapper` object which encapsulates the reference.

### getting a "no matching function call" error

This usually indicates attempting to create a `std::reference_wrapper` without
initializing it with a reference. The issue often arises when accessing or
modifying a map entry using the subscript operator `[]` for a key that doesn’t
exist in the map yet. The subscript operator attempts to default construct a
`std::reference_wrapper`, which is not possible because `std::reference_wrapper`
does not have a default constructor and must be initialized with a reference to
an existing object, leading to this error.

To fix it, we need to make sure to only use keys already existed in the map:

```cpp
class B {
public:
    std::map<std::string, std::reference_wrapper<int>> map;

    void registerVar(const std::string& name, int& var) {
        auto it = map.find(name);
        if (it != map.end()) {
            // Update existing entry
            it->second = std::ref(var);
        } else {
            // Insert new entry
            map.insert(std::make_pair(name, std::ref(var)));
        }
    }
};
```

Besides, make sure the object of the references outlives the map.

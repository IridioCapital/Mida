#include "../strings/MidaString.h"

namespace Mida {
	class MidaEvent {
		private:

		const MidaString& name;

		public:

		MidaEvent ();
        MidaEvent (const char* name);
		MidaEvent (const MidaString& name);

		~MidaEvent ();

		const MidaString& getName () const;
	};
}
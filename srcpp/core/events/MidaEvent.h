namespace Mida {
	class MidaEvent {
		private:
		const MidaString* name;

		public:

		MidaEvent ();
		MidaEvent (const MidaString& name);
		~MidaEvent ();

		MidaString& getName () const;
	}
}
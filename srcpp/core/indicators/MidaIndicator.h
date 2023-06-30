namespace Mida {
	template <class T = long double>
	class MidaIndicator {
		private:

		const MidaVector<T>* values;

		public:

		MidaIndicator ();

		virtual MidaVector<T>& feed (T* values) = 0;
		
		MidaVector<T>& feed (MidaVector<T>& values);
	}
}
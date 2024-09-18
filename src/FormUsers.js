import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Image, Modal } from 'react-native';
import { db, auth } from './firebaseConnection';
import { doc, onSnapshot, addDoc, updateDoc, deleteDoc, collection, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { UsersList } from './users';
import { Picker } from '@react-native-picker/picker';
import CheckBox from 'expo-checkbox';
import axios from 'axios';

export function FormUsers() {
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [placa, setPlaca] = useState("");
  const [carroceria, setCarroceria] = useState("");
  const [eletrico, setEletrico] = useState(false);

  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [carDetails, setCarDetails] = useState([]);
  const [apiMarca, setApiMarca] = useState([]);
  const [filteredMarca, setFilteredMarca] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [filteredModelos, setFilteredModelos] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    const fetchMarcas = async () => {
      try {
        const response = await axios.get('https://parallelum.com.br/fipe/api/v1/carros/marcas');
        setApiMarca(response.data);
      } catch (error) {
        console.error('Erro ao buscar marcas:', error);
      }
    };

    fetchMarcas();
  }, []);

  useEffect(() => {
    if (marca.length > 0) {
      setLoading(true);
      const filtered = apiMarca.filter(m => m.nome.toLowerCase().includes(marca.toLowerCase()));
      setFilteredMarca(filtered);
      setLoading(false);
    } else {
      setFilteredMarca([]);
    }
  }, [marca, apiMarca]);

  useEffect(() => {
    if (modelo.length > 0) {
      const filtered = modelos.filter(m => m.nome.toLowerCase().includes(modelo.toLowerCase()));
      setFilteredModelos(filtered);
    } else {
      setFilteredModelos([]);
    }
  }, [modelo, modelos]);

  const handleMarcaSelect = async (selectedMarca) => {
    setMarca(selectedMarca.nome);
    setFilteredMarca([]);

    try {
      setLoading(true);
      const response = await axios.get(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selectedMarca.codigo}/modelos`);
      setModelos(response.data.modelos);
    } catch (error) {
      console.error('Erro ao buscar modelos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModeloSelect = (selectedModelo) => {
    setModelo(selectedModelo.nome);
    setFilteredModelos([]);
  };



  useEffect(() => {
    if (!user) return;

    async function checkAdmin() {
      const admRef = collection(db, "adm");
      const q = query(admRef, where("uid", "==", user.uid));
      onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          snapshot.forEach((doc) => {
            const data = doc.data();
            setIsAdmin(data.IsAdm);
          });
        }
      });
    }

    async function getDados() {
      setLoading(true);
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", user.uid));
      onSnapshot(q, (snapshot) => {
        let lista = [];
        snapshot.forEach((doc) => {
          lista.push({
            id: doc.id,
            modelo: doc.data().modelo,
            marca: doc.data().marca,
            placa: doc.data().placa,
            carroceria: doc.data().carroceria,
            eletrico: doc.data().eletrico,
            expirationTime: doc.data().expirationTime // Adicionando expirationTime aqui
          });
        });
        setUsers(lista);
        setLoading(false);
      });
    }

    checkAdmin();
    getDados();
  }, [user]);

  function resetForm() {
    setModelo("");
    setMarca("");
    setPlaca("");
    setCarroceria("");
    setEletrico(false);
    setIsEditing("");
  }

  function isFormFilled() {
    return modelo && marca && placa && carroceria; // Verifica se todos os campos estão preenchidos
  }

  async function handleRegister() {
    if (!user) return;
    if (!isFormFilled()) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    await addDoc(collection(db, "users"), {
      modelo: modelo,
      marca: marca,
      placa: placa,
      carroceria: carroceria,
      eletrico: eletrico ? "Sim" : "Não",
      uid: user.uid,
    })
      .then(() => {
        console.log("CADASTRADO COM SUCESSO");
        resetForm();
        setShowForm(false); // Fecha o formulário após adicionar o carro
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function handleEditUser() {
    if (!isEditing) return;
    if (!isFormFilled()) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    const docRef = doc(db, "users", isEditing);
    await updateDoc(docRef, {
      modelo: modelo,
      marca: marca,
      placa: placa,
      carroceria: carroceria,
      eletrico: eletrico ? "Sim" : "Não"
    });

    resetForm();
    setIsEditing("");
    setShowForm(false); // Fecha o formulário após editar o carro
    setLoading(false); // Termina a animação de carregamento
  }

  async function handleDeleteUser(id) {
    setLoading(true);
    const docRef = doc(db, "users", id);
    await deleteDoc(docRef);
    resetForm();
    setLoading(false); // Termina a animação de carregamento
  }

  async function handleLogout() {
    setLoading(true);
    await signOut(auth);
    setLoading(false); // Termina a animação de carregamento
  }

  async function handleSearch() {
    setLoading(true);
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("placa", "==", searchQuery));
    onSnapshot(q, (snapshot) => {
      let lista = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const currentTime = new Date().getTime();
        const expirationTime = data.expirationTime || 0;
        const remainingTime = expirationTime - currentTime;
        lista.push({
          id: doc.id,
          modelo: data.modelo,
          marca: data.marca,
          placa: data.placa,
          carroceria: data.carroceria,
          eletrico: data.eletrico,
          expirationTime: data.expirationTime,
          remainingTime
        });
      });
      setCarDetails(lista);
      setLoading(false);
    });
  }

  function handleClearSearch() {
    setSearchQuery("");
    setCarDetails([]);
  }

  function editUser(data) {
    setModelo(data.modelo);
    setMarca(data.marca);
    setPlaca(data.placa);
    setCarroceria(data.carroceria);
    setEletrico(data.eletrico === "Sim");
    setIsEditing(data.id);
    setShowForm(true); // Exibe o formulário quando um item é editado
  }

  const formatRemainingTime = (remainingTime) => {
    const totalSegundos = Math.floor(remainingTime / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}

      {!showForm && !loading && (
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.buttonMais}>
          <Text style={styles.buttonMaisText}>+</Text>
        </TouchableOpacity>
      )}

      {showForm && (
        <View style={styles.formContainer}>
          <View style={{ justifyContent: 'flex-start', width: '90%', }}>
            <Text style={{ marginLeft: 8, marginTop: -8, fontSize: 28, color: "#f28705", fontWeight: 600, }}>
              Veículo
            </Text>
            <Text style={{ marginLeft: 8, marginTop: 8, marginBottom: 10, fontSize: 15, color: "gray" }}>
              Preencha conforme seu veículo
            </Text>
          </View>
          <Text style={styles.label}>Marca:</Text>
          <TextInput
            style={styles.inputEditar}
            placeholder="Digite a marca do carro..."
            value={marca}
            onChangeText={(text) => setMarca(text)}
          />
          {loading && <ActivityIndicator size="small" color="#0000ff" />}
          {filteredMarca.length > 1 && (
            <FlatList
              style={styles.apiMarca}
              data={filteredMarca}
              keyExtractor={(item) => String(item.codigo)}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleMarcaSelect(item)}>
                  <Text>{item.nome}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <Text style={styles.label}>Modelo:</Text>
          <TextInput
            style={styles.inputEditar}
            placeholder="Digite o modelo do carro..."
            value={modelo}
            onChangeText={(text) => setModelo(text)}
          />
          {loading && <ActivityIndicator size="small" color="#0000ff" />}
          {filteredModelos.length > 0 && (
            <FlatList
              style={styles.apiModelo}
              data={filteredModelos}
              keyExtractor={(item) => String(item.codigo)}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleModeloSelect(item)}>
                  <Text>{item.nome}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <Text style={styles.label}>Placa:</Text>
          <TextInput
            style={styles.inputEditar}
            placeholder="Digite a placa do carro..."
            value={placa}
            onChangeText={(text) => setPlaca(text.toUpperCase())}
          />

          <Text style={styles.label}>Carroceria:</Text>
          <Picker
            selectedValue={carroceria}
            onValueChange={(itemValue) => setCarroceria(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Selecione uma carroceria" value="" />
            <Picker.Item label="Sub Compacto" value="Sub Compacto" />
            <Picker.Item label="Compacto" value="Compacto" />
            <Picker.Item label="Hatch" value="Hatch" />
            <Picker.Item label="SUV" value="SUV" />
            <Picker.Item label="Sedan" value="Sedan" />
            <Picker.Item label="Pickup" value="Pickup" />
          </Picker>

          <Text style={styles.label}>Elétrico:</Text>
          <View style={styles.checkboxContainer}>
            <CheckBox
              value={eletrico}
              onValueChange={(newValue) => setEletrico(newValue)}
              style={styles.checkbox}
            />
            <Text style={{ color: 'gray', fontSize: 13, }}>Marque se for elétrico</Text>
          </View>

          {isEditing !== "" ? (
            <TouchableOpacity style={styles.buttonConfirmar} onPress={handleEditUser}>
              <Text style={styles.buttonText}>Editar carro</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.buttonConfirmar} onPress={handleRegister}>
              <Text style={styles.buttonText}>Adicionar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => {
            resetForm();
            setShowForm(false);
          }} style={styles.buttonFechar}>
            <Text style={styles.buttonText}>Fechar formulário</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && (
        <>
          <View style={styles.boxUsuario}>
            <View>
              <Text style={{ marginLeft: 8, fontSize: 17, color: "#000" }}>
                Olá
              </Text>
              <Text style={{ marginLeft: 8, fontSize: 24, color: "#f28705", fontWeight: 600, }}>
                Usuário
              </Text>
            </View>
            <Image source={require('../assets/logo.png')} style={{ width: 70, height: 70 }} />
            <View style={styles.logoutContainer}>
              <TouchableOpacity style={styles.buttonLogout} onPress={handleLogout}>
                <Text style={styles.buttonText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.cxHistoricoFrase}>
            <Text style={{ marginLeft: 8, marginBottom: 10, fontSize: 18, fontWeight: 600, }}>Carros Cadastrados</Text>
          </View>

          <FlatList
            style={styles.list}
            data={users}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <UsersList
                data={item}
                handleEdit={(item) => editUser(item)}
                handleDelete={(id) => handleDeleteUser(id)}
              />
            )}
          />
        </>
      )}

      {isAdmin && (
        <View style={styles.boxAdm}>
          <Text style={styles.label}>Pesquisar Placa:</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite a placa do carro..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text.toUpperCase()); // Converte o texto para maiúsculas
              if (text.length === 0) {
                handleClearSearch(); // Limpa os resultados quando o campo é limpo
              }
            }}
          />
          <TouchableOpacity style={styles.button} onPress={handleSearch}>
            <Text style={styles.buttonText}>Pesquisar</Text>
          </TouchableOpacity>

          {carDetails.length > 0 && (
            <FlatList
              data={carDetails}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={styles.item}>
                  <Text>{`Modelo: ${item.modelo}`}</Text>
                  <Text>{`Marca: ${item.marca}`}</Text>
                  <Text>{`Placa: ${item.placa}`}</Text>
                  <Text>{`Carroceria: ${item.carroceria}`}</Text>
                  <Text>{`Elétrico: ${item.eletrico}`}</Text>
                  {item.remainingTime > 0 ? (
                    <Text>{`Tempo Restante: ${formatRemainingTime(item.remainingTime)}`}</Text>
                  ) : (
                    <Text>Este carro não está mais alugado.</Text>
                  )}
                </View>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100vh',
    alignItems: 'center',
  },
  button: {
    backgroundColor: "#000",
    marginLeft: 8,
    marginRight: 8,
    marginTop: 8,
    borderRadius: 4,
    padding: 10,
  },
  buttonClear: {
    backgroundColor: "#6c757d",
    marginLeft: 8,
    marginRight: 8,
    marginTop: 8,
    borderRadius: 4,
    padding: 10,
  },
  buttonText: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    marginLeft: 8,
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderColor: "#000",
    borderWidth: 1,
    borderRadius: 4,
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#fff",
  },
  inputEditar: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
    marginBottom: 14,
    placeholderTextColor: "#0101012",
  },
  picker: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 14,
    padding: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 8,
  },
  list: {
    marginTop: 10,
  },
  buttonLogout: {
    backgroundColor: "#dc3545",
    borderRadius: 4,
    padding: 10,
  },
  // logoutContainer: {
  //   position: 'absolute',
  //   top: 10,
  //   right: 10,
  // },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  item: {
    padding: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  formContainer: {
    zIndex: 3,
    marginTop: -20,
    width: '80%',
    backgroundColor: "#f9f9f9",
    padding: 20,
    borderRadius: 10,
  },
  buttonMais: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f28705',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    paddingBottom: 7,
    bottom: 20,
    zIndex: 1,
  },
  buttonMaisText: {
    fontSize: 40,
    fontWeight: 600,
    color: '#fff',
  },
  buttonFechar: {
    backgroundColor: "#8c8c8c",
    borderRadius: 4,
    padding: 10,
    marginVertical: 10,
    width: '100%',
    marginTop: 10,
  },
  buttonConfirmar: {
    backgroundColor: "#f28705",
    marginVertical: 8,
    marginTop: 8,
    borderRadius: 4,
    padding: 10,
  },
  boxUsuario: {
    alignItems: 'baseline',
    width: '90%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10%',
  },
  cxHistoricoFrase: {
    justifyContent: 'space-around',
    width: '90%',
  },
  apiMarca: {
    position: 'absolute',
    backgroundColor: '#fff',
    width: '85%',
    marginTop: 130,
    zIndex: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderTopColor: '#fff',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginLeft: 3,
    padding: 8,
    maxHeight: 300,
  },
  apiModelo: {
    position: 'absolute',
    backgroundColor: '#fff',
    width: '85%',
    marginTop: 206,
    zIndex: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderTopColor: '#fff',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginLeft: 3,
    padding: 8,
    maxHeight: 250,
  },
  boxAdm: {

  },
});
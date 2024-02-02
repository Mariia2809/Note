Vue.component('todo-item', {
    template: `
        <li>
            {{ title }}
            <button class="btn" v-on:click="$emit('remove')">Delete</button>
        </li>
    `,
    props: ['title']
});

Vue.component('columns', {
    template: `
        <div class="columns">
            <column title="New" :cards="newColumn" :locked="locked" @add-card="addCard('newColumn', $event)" @remove-card="removeCard('newColumn', $event)" @save-local-storage="saveToLocalStorage" @move-card-to-in-progress="moveCardToInProgress" @move-card-to-completed="moveCardToCompleted" @move-card-to-new="moveCardToNew"></column>
            <column title="In process" :cards="inProgressColumn" @remove-card="removeCard('inProgressColumn', $event)" @save-local-storage="saveToLocalStorage" @move-card-to-in-progress="moveCardToInProgress" @move-card-to-completed="moveCardToCompleted" @move-card-to-new="moveCardToNew"></column>
            <column title="Done" :cards="completedColumn" @remove-card="removeCard('completedColumn', $event)" @save-local-storage="saveToLocalStorage"></column>
        </div>
    `,
    data() {
        return {
            newColumn: [],
            inProgressColumn: [],
            completedColumn: [],
            maxCards: {
                newColumn: 3,
                inProgressColumn: 5,
                completedColumn: Infinity
            },
            locked: false
        }
    },
    created() {
        this.loadFromLocalStorage();
        this.checkLock();
    },
    methods: {
        addCard(column, customTitle) {
            const totalCards = this.newColumn.length + this.inProgressColumn.length + this.completedColumn.length;
            if (totalCards >= this.maxCards.newColumn + this.maxCards.inProgressColumn + this.maxCards.completedColumn) {
                alert(`Достигнуто максимальное количество карточек во всех столбцах.`);
                return;
            }
            if (this[column].length >= this.maxCards[column]) {
                alert(`Достигнуто максимальное количество карточек в столбце "${this.getColumnTitle(column)}".`);
                return;
            }
            if (column !== 'newColumn') {
                alert(`Можно добавлять заметки только в столбец "New".`);
                return;
            }

            // Проверяем количество карточек в столбце "В процессе" и блокируем добавление новой карточки,
            // если в "В процессе" уже есть 5 карточек
            if (this.inProgressColumn.length >= this.maxCards.inProgressColumn) {
                alert('Столбец "В процессе" уже содержит максимальное количество карточек.');
                return;
            }

            const newCard = {
                title: customTitle || 'New note',
                items: [
                    { text: '', completed: false, editing: true },
                    { text: '', completed: false, editing: true },
                    { text: '', completed: false, editing: true }
                ],
                status: 'New',
                locked: false
            };
            this[column].push(newCard);
            this.saveToLocalStorage();
        },
        removeCard(column, cardIndex) {
            this[column].splice(cardIndex, 1);
            this.saveToLocalStorage();
            this.checkLock();
        },
        saveToLocalStorage() {
            localStorage.setItem('todo-columns', JSON.stringify({
                newColumn: this.newColumn,
                inProgressColumn: this.inProgressColumn,
                completedColumn: this.completedColumn
            }));
        },
        loadFromLocalStorage() {
            const data = JSON.parse(localStorage.getItem('todo-columns'));
            if (data) {
                this.newColumn = data.newColumn || [];
                this.inProgressColumn = data.inProgressColumn || [];
                this.completedColumn = data.completedColumn || [];
                this.newColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.inProgressColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.completedColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
            }
        },
        getColumnTitle(column) {
            switch (column) {
                case 'newColumn':
                    return 'New';
                case 'inProgressColumn':
                    return 'In process';
                case 'completedColumn':
                    return 'Done';
                default:
                    return '';
            }
        },
        moveCardToInProgress(card) {
            const index = this.newColumn.indexOf(card);
            if (index !== -1) {
                if (this.inProgressColumn.length >= this.maxCards.inProgressColumn) {
                    alert('Столбец "In process" уже содержит максимальное количество карточек.');
                    return;
                }

                this.newColumn.splice(index, 1);
                card.status = 'In process';

                // Получаем текущее время
                const currentTime = new Date().toLocaleString();
                // Меняем комментарий на "Modified" с указанием времени
                card.comment = `Modified (${currentTime})`;

                this.inProgressColumn.push(card);
                this.saveToLocalStorage();
                this.checkLock();
            }
        },
        moveCardToCompleted(card) {
            const index = this.inProgressColumn.indexOf(card);
            if (index !== -1) {
                this.inProgressColumn.splice(index, 1);
                this.completedColumn.push(card);
                this.saveToLocalStorage();
            }

            this.checkLock();
        },
        moveCardToNew(card) {
            const index = this.inProgressColumn.indexOf(card);
            if (index !== -1) {
                this.inProgressColumn.splice(index, 1);
                card.status = 'New';
                const currentTime = new Date().toLocaleString();
                if (this.checkCompletionPercentage(card) > 50) {
                    card.comment = `Modified (${currentTime})`;
                    this.inProgressColumn.push(card);
                } else {
                    card.comment = `Sent for Modified (${currentTime})`;
                    this.newColumn.push(card);
                }
                this.saveToLocalStorage();
            }
        },
        checkLock() {
            if (this.inProgressColumn.length >= this.maxCards.inProgressColumn) {
                this.locked = true;
            } else {
                this.locked = false;
            }
            this.newColumn.forEach(card => card.locked = this.locked);
        },
        checkCompletionPercentage(card) {
            const completedItems = card.items.filter(item => item.completed).length;
            const totalItems = card.items.length;
            return (completedItems / totalItems) * 100;
        }
    }
});

Vue.component('column', {
    props: ['title', 'cards', 'locked'],
    template: `
        <div class="column">
            <h2>{{ title }}</h2>
             <form action="" v-if="title === 'New'">
                    <input class="cardText" type="text" v-model="customTitle">
                    <button class="btn" v-if="title === 'New'" @click="addCardWithCustomTitle" ref="new_card" v-bind:disabled="locked">Добавить заметку</button>
              </form>
            <card v-for="(card, index) in cards" :key="index" :card="card" :locked="locked" @remove-card="removeCard(index)" @save-local-storage="saveToLocalStorage" @move-card-to-in-progress="moveCardToInProgress" @move-card-to-completed="moveCardToCompleted" @move-card-to-new="moveCardToNew"></card>
            
        </div>
    `,
    data() {
        return {
            customTitle: ''
        };
    },
    methods: {
        removeCard(cardIndex) {
            this.$emit('remove-card', cardIndex);
        },
        addCardWithCustomTitle() {
            if (this.customTitle) {
                this.$emit('add-card', this.customTitle);
            }
        },
        saveToLocalStorage() {
            this.$emit('save-local-storage');
        },
        moveCardToInProgress(card) {
            this.$emit('move-card-to-in-progress', card);
        },
        moveCardToCompleted(card) {
            this.$emit('move-card-to-completed', card);
        },
        moveCardToNew(card) {
            this.$emit('move-card-to-new', card);
        }
    }
});

Vue.component('card', {
    props: ['card'],
    template: `
        <div class="card">
            <h3>{{ card.title }}</h3>
            <p v-if="card.comment">{{ card.comment }}</p>
            <ul>
                <li   v-for="(item, index) in card.items" :key="index">
                  <input class="cardText"  type="checkbox" v-model="item.completed" @change="saveToLocalStorage" :disabled="card.status === 'Done' || card.locked">
                  <input class="cardText" type="text" v-model="item.text" @input="saveToLocalStorage" :disabled="!item.editing || card.status === 'Done' || (card.status === 'In process' && card.locked)">
        <!--          <button @click="saveItem(index)" v-if="item.editing && card.status !== 'Выполненные' && !isFirstColumnLocked">Сохранить</button>-->
        <!--          <button class="btn" @click="editItem(index)" v-else-if="!item.editing && card.status !== 'Done' && !isFirstColumnLocked">Редактировать</button>-->
        <!--          <button class="btn" @click="removeItem(index)" v-if="card.items.length > 3 && !isFirstColumnLocked && card.status !== 'Done'">Удалить</button>-->
                </li>
        
                <li v-if="card.items.length < 5 && card.status !== 'Done'">
                  <button class="btn" @click="addItem" :disabled="card.locked">Добавить пункт</button>
                </li>
            </ul> 
            <button class="btn" v-if="card.status !== 'Done'" @click="removeCard">Удалить заметку</button>
            <p v-if="card.status === 'Done'">Дата завершения: {{ card.completionDate }}</p>
        </div>
    `,
    methods: {
        addItem() {
            if (this.card.items.length < 5 && this.card.items.length >= 3) {
                this.card.items.push({ text: '', completed: false, editing: true });
                this.saveToLocalStorage();
            } else {
                alert('Достигнуто максимальное количество пунктов или первый столбец заблокирован.');
            }
        },
        removeItem(index) {
            if (this.card.items.length > 3 && !this.locked && this.card.status !== 'Done') {
                this.card.items.splice(index, 1);
                this.saveToLocalStorage();
            }
        },
        removeCard() {
            if (!this.locked && this.card.status !== 'Done') {
                this.$emit('remove-card');
            } else {
                alert('Нельзя удалять карточки в столбце "Done" или если первый столбец заблокирован.');
            }
        },
        saveItem(index) {
            if (this.card.status !== 'Done' && !this.locked) {
                this.card.items[index].editing = false;
                this.saveToLocalStorage();
            }
        },
        editItem(index) {
            if (this.card.status !== 'Done' && !this.locked) {
                this.card.items[index].editing = true;
            }
        },
        saveToLocalStorage() {
            this.checkCardStatus();
            this.$emit('save-local-storage');
        },
        checkCardStatus() {
            const completedItems = this.card.items.filter(item => item.completed).length;
            const totalItems = this.card.items.length;
            const completionPercentage = (completedItems / totalItems) * 100;

            if (completionPercentage === 100 && this.card.status === 'In process') {
                this.card.status = 'Done';
                this.card.completionDate = new Date().toLocaleString();
                this.$emit('move-card-to-completed', this.card);
            } else if (completionPercentage < 50 && this.card.status === 'In process') {
                this.card.status = 'New';
                const currentTime = new Date().toLocaleString();
                this.card.comment = `Sent for Modified (${currentTime})`;
                this.$emit('move-card-to-new', this.card);
            } else if (completionPercentage > 50 && this.card.status === 'New') {
                this.card.status = 'In process';
                this.$emit('move-card-to-in-progress', this.card);
            }
        }
    }
});

new Vue({
    el: '#app',
    data() {
        return {
            newColumn: [],
            inProgressColumn: [],
            completedColumn: [],
            locked: false
        }
    },
    created() {
        this.loadFromLocalStorage();
    },
    methods: {
        removeCard(column, cardIndex) {
            this[column].splice(cardIndex, 1);
            this.saveToLocalStorage();
        },
        saveToLocalStorage() {
            localStorage.setItem('todo-columns', JSON.stringify({
                newColumn: this.newColumn,
                inProgressColumn: this.inProgressColumn,
                completedColumn: this.completedColumn
            }));
        },
        loadFromLocalStorage() {
            const data = JSON.parse(localStorage.getItem('todo-columns'));
            if (data) {
                this.newColumn = data.newColumn || [];
                this.inProgressColumn = data.inProgressColumn || [];
                this.completedColumn = data.completedColumn || [];
                this.newColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.inProgressColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.completedColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
            }
        },
    }
});